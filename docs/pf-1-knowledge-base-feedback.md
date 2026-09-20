# PF-1 — Knowledge base feedback (AI Team review)

**Status:** Planned — not yet implemented, except where noted. This is a spec for a future
execution pass, written up from the AI Team's review of the Connect → Knowledge base page so the
reasoning survives until someone picks it up. It does not cover every piece of feedback from that
review — only the items judged non-major and realistic to implement in the near term.

The "Sort" → "Filter" item originally scoped as PF-1.3 was pulled forward and implemented
immediately rather than deferred, and the in-place editing half of PF-1.1 was pulled forward the
same way — see the changelog note at the bottom of this doc for both. PF-1.1's "Created"/"Updated"
metadata split and the "Replace file" action for non-text formats are still planned, not yet built.
PF-1.2 is entirely still planned.

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
- [x] For MD/TXT documents, **Edit** opens an editor pre-filled with the current content; saving
      updates the existing document in place. *(Shipped without a separate `updatedAt` bump, since
      that field doesn't exist yet — see the still-open "Created"/"Updated" criterion above.)*
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

## Changelog

### 2026-09-20 — PF-1.3 ("Sort" → "Filter") implemented, removed from the backlog
Originally scoped as PF-1.3 with three facets (Status, Type, Assignment) and an open question
about what "Assignment" meant. Implemented directly instead of deferred:
- The **Sort** button (`src/pages/knowledge-base-page.tsx`) is now **Filter**, opening a menu with
  **Status** (`DocStatus`), **Type** (`doc.fileType`, derived from whichever types are present),
  and — Connect mode only — **Assignment**.
- "Assignment" was read as "who can access this document." The previously separate toolbar
  scope-filter dropdown (the Bot-icon control) was folded into Filter as this facet instead of
  staying a second, standalone dropdown — one control instead of two doing related jobs.
- Assignment doesn't render in Crew mode, consistent with Crew having no multi-agent roster (the
  same reasoning already applied to the other agent/group controls hidden there).
- The active-filter count shows on the Filter button, and a "Clear filters" action appears once
  any facet is set.

No open questions remain on this item — it shipped as scoped, with the Assignment reading
confirmed by implementation rather than left pending.

### 2026-09-20 — PF-1.1's in-place editor (MD/TXT) implemented, partially removed from the backlog
The **Edit** capability itself — the actual pain point behind PF-1.1, not just the metadata
labeling — was pulled forward and built:
- Fixed a seed-data bug where the TXT sample document (`doc-2`) had `content` but was missing
  `editable: true`, so its Edit button silently never rendered while the MD sample's did — the
  discrepancy the AI Team flagged.
- The list page's **Edit** button (`src/pages/knowledge-base-page.tsx`) now navigates to the
  detail page and auto-opens the editor via router `state`, instead of being fully inert.
- The detail page's **Edit** button (`src/pages/knowledge-detail-page.tsx`) no longer links back to
  the list — it now toggles a real `DocumentEditor` (title input + Write/Preview tabs for MD, plain
  textarea for TXT, reusing `MarkdownLite` for the preview) that saves back onto the *same*
  document (`id`, `scope`/`groupId`, status all preserved) and recomputes `size`. Unsaved changes
  prompt a confirm dialog on Cancel, matching `WriteDocumentDialog`'s existing convention.

What's still open from PF-1.1: the `date` field has not been split into `createdAt`/`updatedAt`
(the editor does not currently bump any "last updated" timestamp), and non-text formats (PDF,
DOCX, JSON) still have no **Replace file** action. Both remain planned, not built.
