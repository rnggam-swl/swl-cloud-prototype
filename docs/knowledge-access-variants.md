# Knowledge Base access control: variant comparison and decision

**Status:** Decided — **Variant C (Knowledge Groups)** selected by the AI Team.
**Scope:** How a Connect agent's answers get limited to the right subset of the Knowledge base.

This prototype (`swl-cloud`) shipped all three candidate approaches side by side, switchable
live from a single control (`src/components/variant-switcher.tsx`, backed by
`src/lib/knowledge-variant.tsx`), so the team could compare real interaction flows instead of
static mocks. After reviewing all three, the AI Team converged on **Variant C**. This document
records why each variant looked the way it did, why C won, and — since the prototype only
persists to `localStorage` — what a real backend implementation of each variant would actually
require, so the rationale survives past this prototype.

## The problem

A Connect deployment can have several named agents (e.g. General, Sales, Support, Billing —
see `src/lib/settings-data.tsx`'s `connectAgents`). Every uploaded Knowledge base document needs
an answer to: **which agent(s) is this document allowed to be retrieved for?** The three variants
are three different answers to that question.

## Variant A — Multi-select agents

**Concept:** at upload/write time, the editor picks any combination of specific agents for a
document (or marks it "General / All Agents", which is exclusive with picking specific agents).

**Where it lives in this prototype:** `src/components/agent-scope-control.tsx` (multi-select
checkbox list, reading the live agent roster from `usePersistedSettings()`), stored on the
document as `KnowledgeDocument.scope` (primary) + `extraScopes` (additional agents) in
`src/lib/knowledge-data.ts`.

**Pros**
- Most granular: any arbitrary subset of agents per document, decided at the moment of upload.
- One step — no separate visit required later.
- Easy to reason about for a small roster and a small document count.

**Cons**
- Doesn't scale. Relationships to maintain grow with `agents × documents`, all set by hand.
- A new agent does **not** automatically get access to documents that already exist — every
  relevant document has to be revisited and re-scoped, or the new agent starts "blind."
- "What does Agent X know?" has no single owning answer — it requires scanning/filtering across
  every document.
- Because the prototype denormalizes the agent's **display label** directly onto
  `scope`/`extraScopes` (no relational foreign keys in `localStorage`), renaming an agent required
  building explicit rename-cascade logic across every document (`connect-agents-manager.tsx`'s
  `remove()`, and the cascade in `agent-detail-dialog.tsx`'s `save()`). A real relational backend
  would avoid this specific problem (see below), but the *maintenance* problem — re-scoping on
  every roster change — remains structural to the variant itself.

## Variant B — Access routing (assign-after-upload)

**Concept:** documents upload with **no** agent scope at all. Access is assigned afterward, per
document, from a separate "Manage Access" panel — the same underlying relationship as Variant A,
just decoupled into two steps (create, then assign) instead of one.

**Where it lives in this prototype:** `src/components/manage-access-dialog.tsx`.

**Pros**
- Decouples the (often rushed) act of uploading a document from the more deliberate decision of
  who should see it.
- Centralizes assignment into one workflow, which could support a review/approval step later.

**Cons**
- Identical scaling problems to Variant A — it's the same data shape, only the *when* changes.
- Adds a real operational risk Variant A doesn't have: a document can sit **unassigned**
  (visible to nobody, or unintentionally General, depending on the default) until someone
  remembers to open the access panel. Without a queue/notification forcing timely assignment,
  this becomes a silent knowledge gap or an accidental over-exposure.

## Variant C — Knowledge Groups (selected)

**Concept:** every document belongs to exactly **one** named group (e.g. Sales, Support, General).
Every agent subscribes to at most one group. An agent can retrieve a document if the document's
group matches the agent's group, or if the document is ungrouped ("General" — visible to every
agent).

**Where it lives in this prototype:**
- `src/lib/knowledge-variant.tsx` — `KnowledgeGroup` type, `DEFAULT_GROUPS` seed, the
  `KnowledgeVariantProvider` context.
- `src/components/manage-groups-dialog.tsx` — group CRUD (create / rename / delete groups, manage
  membership from the group side).
- `src/components/agent-scope-control.tsx` — renders a group dropdown instead of a multi-select
  when `variant === "c"`.
- `src/components/settings/agent-detail-dialog.tsx` — the Settings → Connect → Agents form's
  group picker (single-select `<select>`), including the combined rename-cascade + group-move
  logic in `save()`.

**Why the AI Team chose it, concretely:**
- **Matches how the org already thinks.** "This document belongs to Sales", "this agent is on
  the Support team" maps directly onto an existing org/department structure, which is why it
  read as the most intuitive of the three in stakeholder review.
- **Onboarding is O(1), not O(n).** Adding a new agent that should see Sales' existing knowledge
  is one membership write (agent → Sales group) — not a retrofit pass across every previously
  scoped document, which is the correctness trap Variant A/B fall into.
- **Renames and deletes are cheap and safe.** A group is a name plus membership — renaming it,
  or deleting it (falling its members and documents back to ungrouped/"General"), never touches
  individual documents' access data. Variants A/B need a real rename-cascade (which this
  prototype had to build by hand) specifically because they denormalize the agent's identity
  onto every scoped document instead of onto one group.
- **Aggregate reasoning is free.** "What can Sales see?" is a single filter
  (`documents WHERE group = agent.group`), not a scan across every document's ad hoc scope list.

**Honest limitation, called out rather than hidden:** Variant C is coarser-grained than A/B. A
document can only belong to **one** group, so a genuinely cross-team document (something both
Sales and Support need) has no clean home — it has to live in a shared/umbrella group, or be
duplicated. This wasn't a blocker for the AI Team's decision, but if cross-group documents turn
out to be common in real usage, the fix is to loosen the model later (see
[Future extensions](#future-extensions-if-needed)) rather than to build for it now.

## Backend mechanism: comparison at a glance

| | New agent onboarding | New document | Renaming an agent | Deleting an agent | "What can Agent X see?" |
|---|---|---|---|---|---|
| **A** | Must retrofit every existing relevant document by hand | Pick N agents at upload time | No BE change needed (FK-based) | Cascade-delete join rows (FK-based) | Join + filter across all documents |
| **B** | Same as A | Starts unscoped; needs a manual follow-up assignment | No BE change needed (FK-based) | Same as A | Same as A |
| **C** | One row: agent → group | Pick 1 group | No BE change needed (FK-based) | `SET NULL` on the one membership column | Single equality filter |

The "no BE change needed" cells matter: this prototype's rename-cascade code
(`connect-agents-manager.tsx`, `agent-detail-dialog.tsx`) exists **only** because `localStorage`
has no relational integrity, so the app stores the agent's display *label* directly on scope
data and has to manually keep it in sync. A real relational database wouldn't have this problem
for any of the three variants — it would use a stable `agent_key` foreign key, and renames would
be free everywhere. Variant C's structural advantage is narrower but still real: it needs far
fewer *rows* to change per operation, because access is mediated through one group per agent/doc
instead of a per-document array.

## Backend design — Variant A (reference, not being built)

```sql
CREATE TABLE knowledge_document_scopes (
  document_id  TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  agent_key    TEXT NOT NULL REFERENCES connect_agents(agent_key) ON DELETE CASCADE,
  PRIMARY KEY (document_id, agent_key)
);
-- knowledge_documents.is_general marks "no agent scoping — visible to everyone".
```

Resolution: `SELECT d.* FROM knowledge_documents d WHERE d.is_general OR EXISTS (SELECT 1 FROM knowledge_document_scopes s WHERE s.document_id = d.id AND s.agent_key = :agent_key)`.

## Backend design — Variant B (reference, not being built)

Same schema as Variant A, plus a workflow-status concept:

```sql
ALTER TABLE knowledge_documents
  ADD COLUMN access_status TEXT NOT NULL DEFAULT 'pending'; -- 'pending' | 'assigned'
```

A document starts `pending` (invisible to every agent, including General) until someone assigns
it at least one scope row or marks it General, at which point it flips to `assigned`. A real
implementation needs a "needs assignment" queue/view so pending documents don't get forgotten —
the operational gap identified above.

## Backend design — Variant C (what we're actually building)

### Schema

```sql
CREATE TABLE knowledge_groups (
  id          TEXT PRIMARY KEY,                          -- slug, e.g. "sales"
  project_id  TEXT NOT NULL REFERENCES projects(id),
  name        TEXT NOT NULL,                              -- display name, freely renameable
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, id)
);

ALTER TABLE connect_agents
  ADD COLUMN knowledge_group_id TEXT REFERENCES knowledge_groups(id) ON DELETE SET NULL;
  -- NULL = agent has no group; sees only ungrouped ("General") documents.

ALTER TABLE knowledge_documents
  ADD COLUMN knowledge_group_id TEXT REFERENCES knowledge_groups(id) ON DELETE SET NULL;
  -- NULL = ungrouped ("General"); visible to every agent regardless of group.
```

`ON DELETE SET NULL` on both foreign keys directly implements the "deleting a group falls its
agents and documents back to General" cascade this prototype already does client-side in
`manage-groups-dialog.tsx` — no application-level cascade code is needed with a real FK.

### Access resolution

```sql
SELECT d.*
FROM knowledge_documents d
JOIN connect_agents a ON a.agent_key = :agent_key
WHERE d.knowledge_group_id = a.knowledge_group_id
   OR d.knowledge_group_id IS NULL;
```

### RAG / vector retrieval integration

Each embedded chunk in the vector index should carry `knowledge_group_id` (nullable) as metadata
alongside the embedding, not as part of the embedded text. At query time, the retrieval call adds
a metadata filter: `knowledge_group_id IN (:agent_group_id, NULL)`, combined with the semantic
search as usual. The key property: **moving a document to a different group is a metadata update
on its existing vectors, not a re-embed** — cheap, and safe to do live.

### Lifecycle / API surface

- `POST /projects/:id/knowledge-groups` — create `{ name }`
- `PATCH /projects/:id/knowledge-groups/:groupId` — rename (metadata-only; touches no document or
  agent row)
- `DELETE /projects/:id/knowledge-groups/:groupId` — delete; `ON DELETE SET NULL` falls members
  and documents back to ungrouped
- `PATCH /projects/:id/connect-agents/:agentKey` — existing agent-update endpoint gains
  `knowledgeGroupId`
- `PATCH /projects/:id/knowledge/:documentId` — existing document-update endpoint gains
  `knowledgeGroupId`

### Migration notes from this prototype

- The prototype's `KnowledgeGroup.agents: string[]` (agent *labels* stored on the group) becomes
  the `connect_agents.knowledge_group_id` foreign key above — the relationship direction flips
  from "group owns a list of agent names" to "agent points at its group," which is what removes
  the need for rename-cascade code entirely.
- The prototype constrains an agent to **at most one** group via a single `<select>` in
  `agent-detail-dialog.tsx`, and a document to **at most one** group via `groupId`. The schema
  above mirrors that 1:1-ish shape deliberately (see [Future extensions](#future-extensions-if-needed)
  for when to loosen it).

### Future extensions (if needed)

Only pursue these if real usage shows a genuine need — not preemptively:
- **Agent in multiple groups:** replace `connect_agents.knowledge_group_id` with a
  `agent_group_membership (agent_key, group_id)` join table.
- **Document visible to multiple groups:** replace `knowledge_documents.knowledge_group_id` with
  a `document_group (document_id, group_id)` join table, and change the retrieval filter to an
  `IN`/`EXISTS` check instead of equality.
Either change can be made independently of the other, and neither is required to ship Variant C
as decided.

## What is not being built

Variants A and B stay as prototype-only reference implementations in this repo (still reachable
via the variant switcher) so the comparison remains reproducible. No real backend work is planned
for them; this document is what preserves the rationale for not building them, so the analysis
doesn't need to be redone later.
