# Ticket — Knowledge scope selector (Knowledge Groups)

**Status:** Proposed solution, grounded in this repo's prototype. Not yet built in production.

This started as a ticket about a single control — the "Add a document" row's scope dropdown — but
it's been extended to also cover the Settings → Connect → Agents side of the same system, since
the two are directly correlated: both are "who does this belong to" pickers over the same
Knowledge Group model, and a reviewer needs both halves to see the full picture.

## Module
Ajena Connect → Knowledge base, and Settings → Connect → Agents

## Feature
"Add a document" upload row — knowledge scope selector (General vs. Knowledge Group), and the
Agent create/edit form's Knowledge Groups field

## Background
On the Connect → Knowledge page, uploading a document via **Add a document** lets a user scope
that document's knowledge. The originally proposed fix for this control assumed per-agent scoping
(Org-wide vs. a specific agent). Following the AI Team's review of the three candidate
access-control approaches (see `docs/knowledge-access-variants.md`), the team has instead selected
the **Knowledge Groups** model: a document belongs to one named group (e.g. Sales, Support), and
agents subscribe to a group rather than being scoped individually. The scope selector on this row
needs to reflect that model, not the older per-agent one.

The original discoverability concern still applies, just against groups instead of agents: if the
scope control only appears (or only offers real choices) once a Knowledge Group has been created,
an org that uploads documents before creating any group never sees that grouping is a capability
of the product, and documents silently default to "everyone can see this" with no visible
alternative.

On the agent side of the same model, an agent's Knowledge Group membership needs its own
discoverability and correctness treatment: an agent can legitimately need knowledge from more than
one group at once (e.g. an agent that handles both Billing and Support), so the form has to support
multi-group assignment, not force a single choice.

## Problem
1. **Discoverability** — if the scope control is absent, or only shows "General (All Agents)" with
   no indication that grouping exists, until a Knowledge Group has been created, users uploading
   early knowledge have no cue that documents can later be scoped to a group.
2. **Inconsistency / surprise** — the same form should not change shape based on unrelated state
   elsewhere in the product (group creation). A user who uploaded documents before any group
   existed, then later creates a group and revisits this page, should see the same control simply
   gain real choices — not a control appearing where there was none before.
3. **Model mismatch** — the control must expose *groups*, not individual agents. Per-agent
   multi-select at upload time no longer matches the adopted access model and should not be
   reintroduced here.
4. **Agent-side single-group limitation** — the Agent form originally let an agent join at most one
   group via a single dropdown. That's too restrictive: agents that legitimately need knowledge
   from more than one group had no way to express that, short of duplicating an agent or picking
   one group and accepting an incomplete knowledge base for that persona.
5. **No explicit "this agent has no group" state** — a group dropdown with a "No group" option
   buried among named groups doesn't clearly communicate that "no group" means "General knowledge
   only" — that distinction needs its own explicit control and explanation.

## Recommendation

### Document upload ("Add a document" row)
Always render the scope selector in the "Add a document" row, regardless of whether any Knowledge
Group exists yet, with two possible values:
- **General (All Agents)** — the default; visible to every agent, group or no group.
- **A specific Knowledge Group** — one at a time; the document is visible only to agents subscribed
  to that group.

With zero groups, the dropdown still opens and clearly shows "General (All Agents)" as the only
current option, plus a short inline hint pointing at how to create one (e.g. "No groups yet —
create one from the toolbar"), rather than the control being silently absent. This is already the
behavior implemented in the prototype's scope control (`src/components/agent-scope-control.tsx`,
Variant C branch) and should be used as the reference implementation.

Once one or more groups exist, the dropdown lists them alongside "General (All Agents)" exactly as
it does in the prototype — no further behavior change once groups exist.

### Agent create/edit form (Settings → Connect → Agents)
- Replace the single-select group dropdown with a **toggle + multi-select**: a switch labeled
  "General" / "Specific groups" in the same row as the field's label, and — when switched on — a
  checkbox list of every Knowledge Group, allowing the agent to belong to more than one at once.
- When the toggle is off, show an inline info message explaining the consequence directly above the
  (hidden) picker: the agent isn't assigned to any group, so it only draws from General knowledge,
  visible to every agent.
- The agent roster list (`connect-agents-manager.tsx`) shows every group an agent belongs to (one
  badge per group), not just the first match.
- No group in the default/seed set is itself named "General" — General is only the implicit
  ungrouped state (zero group memberships), never a selectable named group. A named "General"
  group would be actively misleading: a document assigned to it would only be visible to that
  group's members, the opposite of what "general knowledge" is supposed to mean.
- This is already the behavior implemented in the prototype (`src/components/settings/agent-detail-dialog.tsx`'s
  "Knowledge groups" field) and should be used as the reference implementation.

## Acceptance Criteria

### Document upload
- [ ] The knowledge scope dropdown is visible in the "Add a document" section at all times,
      including when zero Knowledge Groups exist.
- [ ] With zero groups, the dropdown clearly communicates that "General (All Agents)" is the only
      current option, with an inline hint directing the user to create a group (disabled state
      and/or explanatory hint — not a silently absent control).
- [ ] Once one or more groups are created, the dropdown lists them alongside "General (All
      Agents)," with each group showing which agents belong to it.
- [ ] A document can be scoped to at most one group at a time (or left as General) — no per-agent
      multi-select is exposed at upload time.
- [ ] No existing documents are re-scoped or otherwise affected by this change; default upload
      scope remains General.

### Agent create/edit form
- [ ] An agent can be assigned to more than one Knowledge Group at once (multi-select, not a
      single dropdown).
- [ ] A toggle switch — positioned in the same row as the Knowledge Groups field's label — controls
      whether the group picker is shown at all: off means the agent has no group (General only),
      on reveals the multi-select checkbox list.
- [ ] When the toggle is off, an inline info message explains that the agent will only draw from
      General knowledge, visible to every agent — this state is never silent or ambiguous.
- [ ] The seed/default Knowledge Group list contains no group literally named "General" — General
      is exclusively the implicit ungrouped state.
- [ ] The agent roster list shows every group an agent belongs to (all badges), not only the first
      one found.
- [ ] Renaming an agent, or adding/removing it from a group, updates every group's membership in a
      single consistent operation — no intermediate state where the agent is temporarily missing
      from a group it should still belong to.

## Non-Goals
- Not introducing per-agent multi-select scoping on the document-upload row — superseded by the
  Knowledge Groups model (see `docs/knowledge-access-variants.md` for the full rationale).
- Not covering Knowledge Group CRUD (create/rename/delete a group) — that's the separate "Manage
  Groups" control, not this ticket.
- Not allowing a single document to belong to more than one group — documents remain single-group;
  only agents may belong to multiple groups. See `docs/knowledge-access-variants.md`'s "Future
  extensions" section for the (currently unbuilt) document-side version of this relaxation.
- Not changing the agent roster's enabled/disabled (active-in-roster) state or its UI — that's a
  separate, unrelated concern from Knowledge Group membership.

## Impact
Aligns both the "Add a document" scope selector and the Agent form's group assignment with the
access-control model the AI Team actually adopted, instead of shipping either one built around a
superseded per-agent approach. The two are treated as one ticket because they're two views of the
same underlying relationship (which agents can see which documents) — reviewing them together
avoids a document-side fix that quietly assumes an agent-side model (or vice versa) that no longer
matches the adopted design. Improves discoverability of a real capability (Knowledge Group scoping)
for orgs that upload documents or create agents before any group exists, and lets an agent's
knowledge access accurately reflect a persona that legitimately spans more than one group (e.g. an
agent covering both Billing and Support).
