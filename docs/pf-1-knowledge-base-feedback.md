# PF-1 — Knowledge base feedback (AI Team review)

**Status:** Planned — not yet implemented. This is a spec for a future execution pass, written up
from the AI Team's review of the Connect → Knowledge base page so the reasoning survives until
someone picks it up. It does not cover every piece of feedback from that review — only the items
judged non-major and realistic to implement in the near term.

## PF-1.1 — "Created" / "Updated" metadata, and editing a document without re-uploading it

### Background
The AI Team referenced LivePerson and Cognigy and asked for the document list's date column to
say something more specific than a bare date — either "created at" or "modified at." Digging into
*why* they want this surfaced the real pain point: today, updating a knowledge base document means
deleting it and uploading a new file from scratch. There is no way to edit an existing document's
content in place. The label question is secondary to that — renaming the column alone would not
fix the actual complaint.

Confirmed in this repo: `KnowledgeDocument` (`src/lib/knowledge-data.ts`) has a single `date`
field, not separate created/updated timestamps. The **Edit** button already exists in both the
document list (`src/pages/knowledge-base-page.tsx`) and the detail page
(`src/pages/knowledge-detail-page.tsx`) but isn't wired to anything — on the detail page it just
links back to the list. So the gap is real, not hypothetical.

### Recommendation
- Split the single `date` field into `createdAt` and `updatedAt`. Label them **"Created"** and
  **"Updated"** — more neutral and self-explanatory than borrowing LivePerson/Cognigy's own
  internal terms, and it doesn't require the user to know either product.
- For documents with editable raw text (MD/TXT — the ones that already carry a `content` string),
  wire the **Edit** button to an in-place editor (reuse the `WriteDocumentDialog` editor UI) that
  saves back onto the *same* document: update `content`, bump `updatedAt`, keep the same `id`,
  `scope`/`groupId`, and status history. No new document is created.
- For non-text formats (PDF, DOCX, JSON-as-binary, etc.) with no editable raw content, in-place
  editing isn't realistic without a real backend. Add an explicit **"Replace file"** action instead
  — distinct from "Upload Document" — that swaps the underlying file on the *same* document id and
  bumps `updatedAt`, rather than creating a new list entry.

### Acceptance Criteria
- [ ] Document list and detail page show both "Created" and "Updated" (falling back to "Created"
      when never updated, i.e. `updatedAt === createdAt`).
- [ ] For MD/TXT documents, **Edit** opens an editor pre-filled with the current content; saving
      updates the existing document in place and bumps `updatedAt`.
- [ ] For other formats, a **Replace file** action lets the user swap the file on an existing
      document without creating a duplicate entry.
- [ ] Existing documents in seed/localStorage data that only have the old single `date` field
      degrade gracefully (e.g. treat it as both `createdAt` and `updatedAt`) rather than crashing.

### Open Questions
- None blocking — this is the most concretely specified of the three items.

## PF-1.2 — Distinct upload error states

### Background
The AI Team wants upload failures to say *why* they failed, not just "Failed." Cases raised:
**corrupt file**, **duplicate file**, **lost connection**. Today, `UploadRow` (in
`src/components/upload-document-dialog.tsx`) only distinguishes one failure reason — exceeding the
4 MB size limit (`validateFile`) — everything else is unmodeled.

### Recommendation
Treat this as needing one more round of brainstorming before implementation, because the cases
split into two different levels of difficulty:
- **Corrupt file** and **lost connection** are straightforward to model now: extend `UploadRow`'s
  `errorMsg`/`status` with a distinguishing reason, give each a distinct icon and copy, and a
  matching recovery action ("lost connection" → Retry; "corrupt file" → remove and re-select,
  since retrying an unreadable file won't help).
- **Duplicate file** needs a product decision first: duplicate *by what*? Filename, file size, or
  content hash each give a different (and increasingly expensive) answer, and content-hash
  detection isn't meaningful without a real backend to compare against. Once that's decided, the
  recovery action is also different from a plain retry — likely "Replace existing" vs. "Keep both"
  rather than a retry button.

### Acceptance Criteria (draft — revisit after the duplicate-detection decision)
- [ ] Corrupt file and lost-connection failures show distinct copy, icon, and recovery action from
      each other and from the existing size-limit error.
- [ ] Duplicate-file detection's matching key (filename vs. hash) is decided and documented before
      this criterion is finalized.

### Open Questions
- What defines a "duplicate" — filename, size, or content? This decides both the detection logic
  and the recovery UX, and needs its own discussion before scoping the rest of this item.

## PF-1.3 — "Sort" → "Filter" (status, type, assignment)

### Background
The document list's **Sort** button (`src/pages/knowledge-base-page.tsx`) is currently unwired —
it renders but does nothing. The AI Team wants it replaced with a **Filter** control offering
filter-by-status, filter-by-type, and filter-by-"assignment." "Assignment" wasn't clearly defined
by the AI Team.

### Recommendation
- Rename **Sort** to **Filter** and give it real behavior: a popover/menu with three facets.
  - **Status** — maps directly to `DocStatus` (`Queued` / `Indexing` / `Indexed` / `Failed`).
  - **Type** — maps to `doc.fileType`, derived dynamically from whatever file types are present
    in the current document list.
  - **Assignment** — read as "who can access this document," which already exists today as the
    separate toolbar scope-filter dropdown (the Bot-icon control, Connect mode only, filtering by
    `agentLabels`). Recommendation: fold that existing control into "Filter" as its Assignment
    facet instead of keeping it as a second, separate dropdown next to the new Filter button — one
    control instead of two doing related jobs.
- "Assignment" is Connect-only by nature (Crew has no multi-agent roster — see the change that
  already hid the equivalent scope controls on Crew's Knowledge base page), so the Filter control's
  Assignment facet should simply not render in Crew mode, consistent with that earlier change.

### Acceptance Criteria
- [ ] "Sort" button is replaced with "Filter."
- [ ] Filter supports Status and Type in both Crew and Connect modes.
- [ ] Filter supports Assignment (by agent, consistent with however documents are actually scoped
      under the active variant) in Connect mode only; the facet is absent in Crew mode.
- [ ] The existing standalone agent-scope filter dropdown is removed once its behavior is folded
      into Filter, so there is one control for this, not two.

### Open Questions
- None blocking, pending confirmation that "Assignment = who can access this document" is the
  correct reading — flagged in this doc specifically because the AI Team's own note said they
  weren't sure about this one either.
