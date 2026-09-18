import { useEffect, useState } from "react"

export type KbMode = "crew" | "connect"
export type DocStatus = "Completed" | "Running" | "In Queue" | "Failed"

export interface KnowledgeDocument {
  id: string
  name: string
  status: DocStatus
  fileType: string
  size: string
  date: string
  scope: string
  extraScopes?: string[]
  editable?: boolean
  /** Variant C (Knowledge Groups) only — which group this document belongs to. */
  groupId?: string
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
    date: "30 Jul 2026",
    scope: "General",
    extraScopes: ["Sales", "Support"],
  },
  {
    id: "doc-2",
    name: "Human-Centered Human-AI Interaction (HC-HAII): A Human-Centered AI Perspective",
    status: "In Queue",
    fileType: "TXT",
    size: "1.2 MB",
    date: "30 Jul 2026",
    scope: "General",
    extraScopes: ["Sales", "Support"],
    content:
      "Human-Centered Human-AI Interaction (HC-HAII): A Human-Centered AI Perspective\n\nThis paper surveys interaction paradigms between humans and AI systems, arguing that interface design must foreground user agency, transparency, and trust calibration rather than raw model capability.\n\nSection 1 — Motivation\nAs AI systems take on more autonomous roles, the interaction layer becomes the primary site where trust is built or broken.\n\nSection 2 — Design Implications\n- Prefer legible affordances over opaque automation.\n- Give users a cheap way to correct the system.\n- Calibrate confidence signals to actual model reliability.",
  },
  {
    id: "doc-3",
    name: "THE EFFECTS OF MOBILE SERVICE QUALITIES ON CUSTOMER REUSE INTENTION OF GOJEK SUPER APP",
    status: "Running",
    fileType: "DOCX",
    size: "1.2 MB",
    date: "30 Jul 2026",
    scope: "General",
    extraScopes: ["Sales", "Support"],
  },
  {
    id: "doc-4",
    name: "Human-Computer Interaction Design Principles for Enhancing User Experience in Mobile Applications",
    status: "Completed",
    fileType: "MD",
    size: "1.2 MB",
    date: "30 Jul 2026",
    scope: "General",
    extraScopes: ["Sales", "Support"],
    editable: true,
    content:
      "# Human-Computer Interaction Design Principles\n\n## Overview\nThis document summarizes core HCI design principles for enhancing user experience in mobile applications, covering usability heuristics, information architecture, and interaction patterns.\n\n## Key Principles\n- **Consistency** — reuse familiar patterns across screens.\n- **Feedback** — every action should produce a visible response.\n- **Error prevention** — design constraints that stop mistakes before they happen.\n- **Minimalist design** — surface only what's relevant to the current task.\n\n## Recommended Reading\nNielsen's 10 usability heuristics remain the foundation for most mobile HCI guidelines used across Sawala's product teams.",
  },
  {
    id: "doc-5",
    name: "The Human Brain Encodes a Chronicle of Visual Events at Each Instant of Time Through the Multiplexing of Traveling Waves",
    status: "Completed",
    fileType: "JSON",
    size: "1.2 MB",
    date: "30 Jul 2026",
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
    status: "Completed",
    fileType: "PDF",
    size: "1.2 MB",
    date: "30 Jul 2026",
    scope: "General",
    extraScopes: ["Sales", "Support"],
  },
]

export const statusStyles: Record<DocStatus, string> = {
  Completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Running: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "In Queue": "bg-muted text-muted-foreground",
  Failed: "bg-destructive/15 text-destructive",
}

// Prototype persistence layer — there is no backend yet, so the document
// list lives in localStorage. This keeps created/uploaded/deleted documents
// intact across reloads without pretending there's a real API behind them.
const STORAGE_KEY = "ajena-knowledge-documents"

function loadDocuments(): KnowledgeDocument[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as KnowledgeDocument[]
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
