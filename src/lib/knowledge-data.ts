import { useEffect, useState } from "react"

export type KbMode = "crew" | "connect"
export type DocStatus = "Indexed" | "Indexing" | "Queued" | "Failed"

// Why a document ended up "Failed" — surfaced instead of one generic message
// so the user knows whether to retry, swap the file, or rename/replace it.
// Grouped by the stage that caught the problem: upload (the file never made
// it in) vs. processing (it uploaded fine but couldn't be indexed).
export type FailureReasonCode =
  // Upload stage
  | "upload_network_error"
  | "upload_timeout"
  | "upload_server_error"
  | "file_too_large"
  | "unsupported_type"
  | "empty_file"
  // Processing/indexing stage
  | "file_corrupt"
  | "file_password_protected"
  | "no_extractable_text"
  | "encoding_error"
  | "processing_timeout"
  | "duplicate_name"
  | "duplicate_content"
  | "indexing_service_unavailable"

export const FAILURE_REASON_COPY: Record<
  FailureReasonCode,
  {
    message: string
    /** Whether re-running indexing on the same file can plausibly fix this —
     * false means the file itself needs to change first, so the list/detail
     * pages hide the "Retry" action rather than offer a fix that can't work. */
    retryable: boolean
  }
> = {
  upload_network_error: {
    message: "Upload interrupted — check your connection and try again.",
    retryable: true,
  },
  upload_timeout: {
    message: "Upload timed out. Your connection may be slow — try again or use a smaller file.",
    retryable: true,
  },
  upload_server_error: {
    message: "We couldn't reach the server. Try again in a moment.",
    retryable: true,
  },
  file_too_large: {
    message: "Exceeds the 4 MB upload limit.",
    retryable: false,
  },
  unsupported_type: {
    message: "This file type isn't supported. Upload Markdown, Text, JSON, PDF, or Office docs.",
    retryable: false,
  },
  empty_file: {
    message: "This file is empty — nothing to upload.",
    retryable: false,
  },
  file_corrupt: {
    message: "This file appears to be corrupted and can't be opened.",
    retryable: false,
  },
  file_password_protected: {
    message: "This file is password-protected. Remove the password and re-upload.",
    retryable: false,
  },
  no_extractable_text: {
    message: "No readable text found — this may be a scanned image. Try a text-based version.",
    retryable: false,
  },
  encoding_error: {
    message: "This file's text encoding couldn't be read. Re-save it as UTF-8 and try again.",
    retryable: false,
  },
  processing_timeout: {
    message: "This document took too long to process. Try splitting it into smaller files.",
    retryable: true,
  },
  duplicate_name: {
    message: "Another file in this upload already has this name.",
    retryable: false,
  },
  duplicate_content: {
    message: "This looks like a near-duplicate of a document already in this knowledge base.",
    retryable: false,
  },
  indexing_service_unavailable: {
    message: "Indexing is temporarily unavailable. We'll retry automatically.",
    retryable: true,
  },
}

export interface KnowledgeDocument {
  id: string
  name: string
  status: DocStatus
  fileType: string
  size: string
  /** ISO timestamp — when the document was first saved. Never changes. */
  createdAt: string
  /** ISO timestamp — last change to the document's name or content (edit or
   * replace-on-upload). Access/scope changes deliberately don't touch it. */
  updatedAt: string
  /** Content revision, starting at 1; bumped whenever updatedAt is. */
  version?: number
  scope: string
  extraScopes?: string[]
  editable?: boolean
  /** Variant C (Knowledge Groups) only — which group this document belongs to. */
  groupId?: string
  /** Only meaningful when status is "Failed" — which case caused it. */
  failureReason?: FailureReasonCode
  /** Demo scaffolding — see upload-scenarios.ts. Scripts how the simulated
   * indexing pipeline should end for this document; absent means it will
   * reach "Indexed". Drop this once a real indexing backend exists. */
  pendingFailure?: FailureReasonCode
  /** Mock file content used by the detail/preview page. */
  content?: string
}

export const initialDocuments: KnowledgeDocument[] = [
  {
    id: "doc-1",
    name: "Agentic AI: A Comprehensive Survey of Technologies, Applications, and Societal Implications",
    status: "Failed",
    fileType: "PDF",
    size: "1.2 MB",
    createdAt: "2026-07-30T09:12:00+07:00",
    updatedAt: "2026-07-30T09:12:00+07:00",
    scope: "General",
    extraScopes: ["Sales", "Support"],
    failureReason: "file_corrupt",
  },
  {
    id: "doc-2",
    name: "Human-Centered Human-AI Interaction (HC-HAII): A Human-Centered AI Perspective",
    status: "Queued",
    fileType: "TXT",
    size: "1.2 MB",
    createdAt: "2026-07-30T09:20:00+07:00",
    updatedAt: "2026-08-14T15:42:00+07:00",
    version: 2,
    scope: "General",
    extraScopes: ["Sales", "Support"],
    editable: true,
    content:
      "Human-Centered Human-AI Interaction (HC-HAII): A Human-Centered AI Perspective\n\nThis paper surveys interaction paradigms between humans and AI systems, arguing that interface design must foreground user agency, transparency, and trust calibration rather than raw model capability.\n\nSection 1 — Motivation\nAs AI systems take on more autonomous roles, the interaction layer becomes the primary site where trust is built or broken.\n\nSection 2 — Design Implications\n- Prefer legible affordances over opaque automation.\n- Give users a cheap way to correct the system.\n- Calibrate confidence signals to actual model reliability.",
  },
  {
    id: "doc-3",
    name: "THE EFFECTS OF MOBILE SERVICE QUALITIES ON CUSTOMER REUSE INTENTION OF GOJEK SUPER APP",
    status: "Indexing",
    fileType: "DOCX",
    size: "1.2 MB",
    createdAt: "2026-07-30T10:05:00+07:00",
    updatedAt: "2026-07-30T10:05:00+07:00",
    scope: "General",
    extraScopes: ["Sales", "Support"],
  },
  {
    id: "doc-4",
    name: "Human-Computer Interaction Design Principles for Enhancing User Experience in Mobile Applications",
    status: "Indexed",
    fileType: "MD",
    size: "1.2 MB",
    createdAt: "2026-07-30T10:31:00+07:00",
    updatedAt: "2026-07-30T10:31:00+07:00",
    scope: "General",
    extraScopes: ["Sales", "Support"],
    editable: true,
    content:
      "# Human-Computer Interaction Design Principles\n\n## Overview\nThis document summarizes core HCI design principles for enhancing user experience in mobile applications, covering usability heuristics, information architecture, and interaction patterns.\n\n## Key Principles\n- **Consistency** — reuse familiar patterns across screens.\n- **Feedback** — every action should produce a visible response.\n- **Error prevention** — design constraints that stop mistakes before they happen.\n- **Minimalist design** — surface only what's relevant to the current task.\n\n## Recommended Reading\nNielsen's 10 usability heuristics remain the foundation for most mobile HCI guidelines used across Sawala's product teams.",
  },
  {
    id: "doc-5",
    name: "The Human Brain Encodes a Chronicle of Visual Events at Each Instant of Time Through the Multiplexing of Traveling Waves",
    status: "Indexed",
    fileType: "JSON",
    size: "1.2 MB",
    createdAt: "2026-07-30T11:02:00+07:00",
    updatedAt: "2026-07-30T11:02:00+07:00",
    scope: "General",
    extraScopes: ["Sales", "Support"],
    content: `{
  "title": "The Human Brain Encodes a Chronicle of Visual Events at Each Instant of Time Through the Multiplexing of Traveling Waves",
  "authors": ["Zabeh, E.", "Foster, N.", "Yeung, K."],
  "keywords": ["neuroscience", "visual cortex", "traveling waves", "temporal encoding"],
  "abstract": "This study investigates how traveling cortical waves encode the temporal sequence of visual events, proposing that the brain multiplexes successive instants of a scene onto a shared population code."
}`,
  },
  {
    id: "doc-6",
    name: "SOP Test Case Sawala",
    status: "Indexed",
    fileType: "PDF",
    size: "1.2 MB",
    createdAt: "2026-07-30T13:47:00+07:00",
    updatedAt: "2026-07-30T13:47:00+07:00",
    scope: "General",
    extraScopes: ["Sales", "Support"],
  },
  {
    id: "doc-7",
    name: "SOP Test Case Sawala (1)",
    status: "Failed",
    fileType: "PDF",
    size: "1.2 MB",
    createdAt: "2026-07-31T08:55:00+07:00",
    updatedAt: "2026-07-31T08:55:00+07:00",
    scope: "General",
    extraScopes: ["Sales", "Support"],
    failureReason: "duplicate_content",
  },
]

/** "30 Jul 2026", or "30 Jul 2026, 09:12" with the time. */
export function formatDocDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
  })
}

export const statusStyles: Record<DocStatus, string> = {
  Indexed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Indexing: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Queued: "bg-muted text-muted-foreground",
  Failed: "bg-destructive/15 text-destructive",
}

// Prototype persistence layer — there is no backend yet, so the document
// list lives in localStorage. This keeps created/uploaded/deleted documents
// intact across reloads without pretending there's a real API behind them.
const STORAGE_KEY = "ajena-knowledge-documents"

// Status names used before they were renamed.
const LEGACY_STATUS: Record<string, DocStatus> = {
  "In Queue": "Queued",
  Running: "Indexing",
  Completed: "Indexed",
}

// Brings documents saved by older builds up to the current shape: legacy
// status names, and a display-only `date` ("18 Sept 2026") lifted into both
// timestamps.
function migrateDocument(doc: KnowledgeDocument & { date?: string }): KnowledgeDocument {
  const status = LEGACY_STATUS[doc.status] ?? doc.status
  if (doc.createdAt) return { ...doc, status }
  const parsed = doc.date ? new Date(doc.date.replace("Sept", "Sep")) : new Date(NaN)
  const iso = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
  const { date: _legacy, ...rest } = doc
  return { ...rest, status, createdAt: iso, updatedAt: iso }
}

function loadDocuments(): KnowledgeDocument[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return (JSON.parse(raw) as KnowledgeDocument[]).map(migrateDocument)
  } catch {
    // Malformed or inaccessible storage — fall back to the seed data below.
  }
  return initialDocuments
}

export function usePersistedDocuments() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(loadDocuments)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
    } catch {
      // Storage full or blocked (private mode) — state still works in-memory
      // for the rest of this tab's session.
    }
  }, [documents])

  return [documents, setDocuments] as const
}

export const modeCopy: Record<
  KbMode,
  { badge: string; badgeClass: string; description: string; listHref: string }
> = {
  crew: {
    badge: "Internal Only · Project-wide",
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
    description: "Knowledge your internal chat can use · scoped to project default",
    listHref: "/crew/knowledge",
  },
  connect: {
    badge: "External Accessible · Org-wide",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description:
      "Knowledge your WhatsApp assistant can use · shared across your whole organization",
    listHref: "/connect/knowledge",
  },
}
