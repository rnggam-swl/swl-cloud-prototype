import { useEffect, useState } from "react"
import {
  AudioLines,
  Bell,
  Bot,
  Clock,
  Code2,
  Database,
  DatabaseZap,
  FileText,
  GitBranch,
  Image,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  Upload,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react"

export type FlowStepKind =
  | "transform"
  | "kodena"
  | "ai"
  | "branch"
  | "extract_document"
  | "image_generate"
  | "voice_synthesize"
  | "call_flow"
  | "berkasna_upload"
  | "sebar_send"
  | "connect_reply"
  | "connect_inject"
  | "notify_staff"
  | "datana_push"
  | "datana_pipeline_push"

export type TriggerKind = "manual" | "cron" | "whatsapp" | "email"

export type FlowMatchType = "always" | "keyword" | "menu_option" | "agent"

export interface WorkflowTrigger {
  kind: TriggerKind
  cronExpr?: string
  timezone?: string
  fromFilter?: string
  subjectFilter?: string
  /** whatsapp trigger only — Settings → Connect → Flow routing edits these. */
  matchType?: FlowMatchType
  matchValue?: string
  replyMode?: "additive" | "handoff"
}

export interface WorkflowStep {
  id: string
  kind: FlowStepKind
  name: string
  enabled: boolean
  config: Record<string, string | boolean>
  dependsOn?: string[]
}

export type RunKind = "simulated" | "test" | "triggered"
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"
export type StepRunStatus = "pending" | "running" | "succeeded" | "failed" | "skipped"

export interface StepTrace {
  stepId: string
  name: string
  kind: FlowStepKind
  status: StepRunStatus
  output?: string
  error?: string
}

export interface WorkflowRun {
  id: string
  kind: RunKind
  status: RunStatus
  startedAt: string
  label: string
  trace?: StepTrace[]
}

export interface WorkflowParameter {
  name: string
  description?: string
}

export interface WorkflowSummary {
  id: string
  name: string
  description: string
  enabled: boolean
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  lastRun?: { status: "succeeded" | "failed" | "running"; when: string }
  runs?: WorkflowRun[]
  parameters?: WorkflowParameter[]
}

export const TRIGGER_META: Record<
  TriggerKind,
  { label: string; icon: LucideIcon }
> = {
  manual: { label: "On demand", icon: Sparkles },
  cron: { label: "On schedule", icon: Clock },
  whatsapp: { label: "On WhatsApp message", icon: MessageCircle },
  email: { label: "On email received", icon: Mail },
}

export const TRIGGER_ACCENT = "#6366f1"

export function triggerSummary(trigger: WorkflowTrigger): string {
  switch (trigger.kind) {
    case "cron":
      return trigger.cronExpr ? `cron ${trigger.cronExpr}` : "cron · not set"
    case "whatsapp":
      return "every message"
    case "email":
      return [trigger.fromFilter && `from ${trigger.fromFilter}`, trigger.subjectFilter && `subject: ${trigger.subjectFilter}`]
        .filter(Boolean)
        .join(" · ") || "any email"
    case "manual":
    default:
      return "On demand"
  }
}

export const STEP_META: Record<
  FlowStepKind,
  { label: string; icon: LucideIcon; accent: string }
> = {
  transform: { label: "Transform", icon: Wand2, accent: "#64748b" },
  kodena: { label: "Kodena function", icon: Code2, accent: "#0ea5e9" },
  ai: { label: "AI step", icon: Bot, accent: "#8b5cf6" },
  branch: { label: "Branch", icon: GitBranch, accent: "#f59e0b" },
  extract_document: { label: "Read a document", icon: FileText, accent: "#14b8a6" },
  image_generate: { label: "Generate an image", icon: Image, accent: "#d946ef" },
  voice_synthesize: { label: "Speak this", icon: AudioLines, accent: "#a855f7" },
  call_flow: { label: "Call another flow", icon: Workflow, accent: "#0ea5e9" },
  berkasna_upload: { label: "Upload to Berkasna", icon: Upload, accent: "#22c55e" },
  sebar_send: { label: "Send via Sebar", icon: Send, accent: "#3b82f6" },
  connect_reply: { label: "Reply into Connect", icon: MessageCircle, accent: "#25d366" },
  connect_inject: { label: "Hand off to AI agent", icon: Sparkles, accent: "#25d366" },
  notify_staff: { label: "Notify staff", icon: Bell, accent: "#ef4444" },
  datana_push: { label: "Write to Datana", icon: Database, accent: "#e11d48" },
  datana_pipeline_push: { label: "Send to Datana Pipeline", icon: DatabaseZap, accent: "#be123c" },
}

export const STEP_GROUPS: { label: string; kinds: FlowStepKind[] }[] = [
  { label: "Logic", kinds: ["transform", "branch", "call_flow"] },
  { label: "AI", kinds: ["ai", "image_generate", "voice_synthesize"] },
  { label: "Documents & media", kinds: ["extract_document", "berkasna_upload"] },
  { label: "Messaging", kinds: ["connect_reply", "connect_inject", "sebar_send", "notify_staff"] },
  { label: "Data", kinds: ["datana_push", "datana_pipeline_push"] },
  { label: "Code", kinds: ["kodena"] },
]

// Matches production's Board/Linear column split: every step kind is either
// a "Process" step (transforms/decides/reads) or an "Output" step (sends,
// writes, or hands off somewhere). Input is always just the trigger.
export const PROCESS_KINDS: FlowStepKind[] = [
  "transform",
  "kodena",
  "ai",
  "branch",
  "extract_document",
  "image_generate",
  "voice_synthesize",
  "call_flow",
]

export const OUTPUT_KINDS: FlowStepKind[] = [
  "berkasna_upload",
  "sebar_send",
  "connect_reply",
  "connect_inject",
  "notify_staff",
  "datana_push",
  "datana_pipeline_push",
]

// Narrows STEP_GROUPS to a caller's allowed kinds, dropping groups left empty.
// Anything in `allowed` that isn't in any STEP_GROUPS entry falls into a
// trailing "Other" group rather than disappearing — ported verbatim from the
// real `groupKinds` in sawala-cloud-ui's flowNodeMeta.ts.
export function groupsFor(allowed: FlowStepKind[]): { label: string; kinds: FlowStepKind[] }[] {
  const set = new Set(allowed)
  const grouped = STEP_GROUPS.map((g) => ({ label: g.label, kinds: g.kinds.filter((k) => set.has(k)) })).filter(
    (g) => g.kinds.length > 0,
  )
  const claimed = new Set(STEP_GROUPS.flatMap((g) => g.kinds))
  const rest = allowed.filter((k) => !claimed.has(k))
  return rest.length > 0 ? [...grouped, { label: "Other", kinds: rest }] : grouped
}

export const ALL_STEP_KINDS: FlowStepKind[] = [...PROCESS_KINDS, ...OUTPUT_KINDS]

export type FieldKind = "text" | "textarea" | "select" | "number" | "checkbox"

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
  placeholder?: string
  hint?: string
}

const MODEL_OPTIONS = [
  { value: "sawala-mini", label: "Sawala Mini" },
  { value: "sawala-pro", label: "Sawala Pro" },
  { value: "sawala-vision", label: "Sawala Vision" },
]

// The real options are injected at render time in workflow-step-dialogs.tsx
// from the Connect agent roster (settings-data.ts) — this is just the
// always-present "none" sentinel so defaultConfig() has something to seed.
const AGENT_SELECT_OPTIONS = [{ value: "none", label: "No agent — just prompt the model" }]

export const FORM_FIELDS: Record<FlowStepKind, FieldDef[]> = {
  ai: [
    { key: "agent", label: "Agent", kind: "select", options: AGENT_SELECT_OPTIONS },
    { key: "model", label: "Model", kind: "select", options: MODEL_OPTIONS },
    { key: "instruction", label: "Instruction", kind: "textarea", placeholder: "Draft a warm, concise reply…" },
    { key: "input", label: "Input", kind: "text", placeholder: "{{trigger.message}}" },
    { key: "expectJson", label: "Expect JSON output", kind: "checkbox" },
    { key: "useKnowledgeBase", label: "Use knowledge base", kind: "checkbox" },
    { key: "useTools", label: "Let the agent use tools", kind: "checkbox" },
    { key: "maxOutputTokens", label: "Max output tokens", kind: "number", placeholder: "1024" },
  ],
  extract_document: [
    { key: "asset", label: "Asset", kind: "text", placeholder: "{{trigger.attachment}}", hint: "Point at a WhatsApp attachment or a prior step's output." },
    { key: "filenameHint", label: "Filename hint", kind: "text", placeholder: "invoice.pdf" },
    { key: "language", label: "Spoken language", kind: "select", options: [
      { value: "auto", label: "Auto-detect" },
      { value: "id", label: "Indonesian" },
      { value: "en", label: "English" },
    ] },
    { key: "transcriptionModel", label: "Transcription model", kind: "select", options: [
      { value: "sawala-whisper", label: "Sawala Whisper" },
      { value: "sawala-whisper-large", label: "Sawala Whisper Large" },
    ] },
    { key: "pdfPasswords", label: "PDF passwords", kind: "text", hint: "Comma-separated, optional." },
  ],
  image_generate: [
    { key: "prompt", label: "Prompt", kind: "textarea", placeholder: "A friendly illustration of…" },
    { key: "qualitySteps", label: "Quality steps", kind: "number", placeholder: "30" },
    { key: "width", label: "Width (px)", kind: "number", placeholder: "1024" },
    { key: "height", label: "Height (px)", kind: "number", placeholder: "1024" },
    { key: "filename", label: "Filename", kind: "text", placeholder: "output.png" },
    { key: "model", label: "Image model", kind: "select", options: [
      { value: "sawala-image-fast", label: "Sawala Image Fast" },
      { value: "sawala-image-hd", label: "Sawala Image HD" },
    ] },
  ],
  voice_synthesize: [
    { key: "text", label: "Text to speak", kind: "textarea", placeholder: "{{steps.s1.output}}" },
    { key: "language", label: "Spoken language", kind: "select", options: [
      { value: "id", label: "Indonesian" },
      { value: "en", label: "English" },
    ] },
    { key: "filename", label: "Filename", kind: "text", placeholder: "reply.mp3" },
    { key: "model", label: "Voice model", kind: "select", options: [
      { value: "sawala-voice-natural", label: "Sawala Voice Natural" },
      { value: "sawala-voice-expressive", label: "Sawala Voice Expressive" },
    ] },
  ],
  call_flow: [
    { key: "callee", label: "Workflow to call", kind: "select", options: [] },
    { key: "arguments", label: "Arguments (JSON)", kind: "textarea", placeholder: "{}" },
  ],
  kodena: [
    { key: "script", label: "Deployed script", kind: "select", options: [
      { value: "invoice-utils", label: "invoice-utils" },
      { value: "text-helpers", label: "text-helpers" },
    ] },
    { key: "functionPath", label: "Function", kind: "text", placeholder: "formatInvoice" },
    { key: "arguments", label: "Arguments (JSON)", kind: "textarea", placeholder: "{}" },
  ],
  transform: [
    { key: "template", label: "Template (JSON)", kind: "textarea", placeholder: "{\n  \"result\": \"{{steps.s1.output}}\"\n}" },
  ],
  branch: [
    { key: "left", label: "Left", kind: "text", placeholder: "{{steps.s1.output}}" },
    { key: "operator", label: "Operator", kind: "select", options: [
      { value: "eq", label: "equals" },
      { value: "neq", label: "not equals" },
      { value: "contains", label: "contains" },
      { value: "gt", label: "greater than" },
      { value: "lt", label: "less than" },
    ] },
    { key: "right", label: "Right", kind: "text", placeholder: "expected value" },
  ],
  berkasna_upload: [
    { key: "filename", label: "Filename", kind: "text", placeholder: "export.csv" },
    { key: "content", label: "Content", kind: "textarea", placeholder: "{{steps.s2.output}}" },
    { key: "contentType", label: "Content type", kind: "text", placeholder: "text/csv" },
  ],
  sebar_send: [
    { key: "to", label: "To", kind: "text", placeholder: "customer@example.com" },
    { key: "subject", label: "Subject", kind: "text" },
    { key: "body", label: "Body", kind: "textarea" },
    { key: "attachments", label: "Attachments", kind: "text", hint: "Optional." },
    { key: "cc", label: "CC", kind: "text", hint: "Optional, comma-separated." },
    { key: "bcc", label: "BCC", kind: "text", hint: "Optional, comma-separated." },
  ],
  notify_staff: [
    { key: "to", label: "To", kind: "text", hint: "Optional — defaults to the on-call channel." },
    { key: "subject", label: "Subject", kind: "text" },
    { key: "message", label: "Message", kind: "textarea" },
  ],
  connect_reply: [
    { key: "message", label: "Message", kind: "textarea", placeholder: "{{steps.s1.output}}" },
  ],
  connect_inject: [
    { key: "agent", label: "Agent", kind: "select", options: AGENT_SELECT_OPTIONS },
    { key: "model", label: "Model", kind: "select", options: MODEL_OPTIONS },
    { key: "text", label: "Text for the agent", kind: "textarea" },
    { key: "extraInstruction", label: "Extra instruction", kind: "textarea", hint: "Optional." },
  ],
  datana_push: [
    { key: "collectionSlug", label: "Collection slug", kind: "text", placeholder: "documents" },
    { key: "data", label: "Data (JSON)", kind: "textarea", placeholder: "{{steps.s2.output}}" },
    { key: "status", label: "Status", kind: "select", options: [
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
    ] },
    { key: "dedupeKeys", label: "Dedupe keys", kind: "text", hint: "Comma-separated, optional." },
    { key: "onDuplicate", label: "On duplicate", kind: "select", options: [
      { value: "skip", label: "Skip" },
      { value: "overwrite", label: "Overwrite" },
    ] },
  ],
  datana_pipeline_push: [
    { key: "collectionSlug", label: "Collection slug", kind: "text", placeholder: "documents" },
    { key: "data", label: "Data (JSON)", kind: "textarea", placeholder: "{{steps.s2.output}}" },
    { key: "dedupeKeys", label: "Dedupe keys", kind: "text", hint: "Comma-separated, optional." },
  ],
}

export interface StarterTemplate {
  id: string
  name: string
  description: string
  build: () => { trigger: WorkflowTrigger; steps: WorkflowStep[] }
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "whatsapp-auto-reply",
    name: "WhatsApp auto-reply",
    description:
      "When a customer messages on WhatsApp, an AI step drafts a reply and Connect sends it back into the same thread.",
    build: (): { trigger: WorkflowTrigger; steps: WorkflowStep[] } => ({
      trigger: { kind: "whatsapp" },
      steps: [
        {
          id: "s1",
          kind: "ai",
          name: "Draft a reply",
          enabled: true,
          config: { agent: "none", model: "sawala-pro", instruction: "Draft a warm, concise reply to the customer's message.", input: "{{trigger.message}}" },
        },
        {
          id: "s2",
          kind: "connect_reply",
          name: "Reply into Connect",
          enabled: true,
          config: { message: "{{steps.s1.output}}" },
        },
      ],
    }),
  },
  {
    id: "document-to-csv",
    name: "Document → CSV file",
    description:
      "Read an attached PDF/CSV, have AI transform it, and write a new CSV file to storage.",
    build: (): { trigger: WorkflowTrigger; steps: WorkflowStep[] } => ({
      trigger: { kind: "whatsapp" },
      steps: [
        {
          id: "s1",
          kind: "extract_document",
          name: "Read the document",
          enabled: true,
          config: { asset: "{{trigger.attachment}}", language: "auto" },
        },
        {
          id: "s2",
          kind: "ai",
          name: "Transform to CSV",
          enabled: true,
          config: { agent: "none", model: "sawala-pro", instruction: "Convert the extracted content into CSV rows.", input: "{{steps.s1.output}}" },
        },
        {
          id: "s3",
          kind: "berkasna_upload",
          name: "Write the CSV file",
          enabled: true,
          config: { filename: "export.csv", content: "{{steps.s2.output}}", contentType: "text/csv" },
        },
      ],
    }),
  },
  {
    id: "document-to-datana",
    name: "Document → Datana records",
    description:
      "Read an attached document, have AI emit a JSON array, and write each row as a typed record into a Datana collection.",
    build: (): { trigger: WorkflowTrigger; steps: WorkflowStep[] } => ({
      trigger: { kind: "whatsapp" },
      steps: [
        {
          id: "s1",
          kind: "extract_document",
          name: "Read the document",
          enabled: true,
          config: { asset: "{{trigger.attachment}}", language: "auto" },
        },
        {
          id: "s2",
          kind: "ai",
          name: "Extract rows as JSON",
          enabled: true,
          config: { agent: "none", model: "sawala-pro", instruction: "Extract each row as an item in a JSON array.", input: "{{steps.s1.output}}", expectJson: true },
        },
        {
          id: "s3",
          kind: "datana_push",
          name: "Write to Datana",
          enabled: true,
          config: { collectionSlug: "documents", data: "{{steps.s2.output}}", status: "draft", onDuplicate: "skip" },
        },
      ],
    }),
  },
]

export const initialWorkflows: WorkflowSummary[] = [
  {
    id: "f1",
    name: "New lead auto-reply",
    description: "Reply to the first WhatsApp message from a new lead.",
    enabled: true,
    trigger: { kind: "whatsapp" },
    steps: [
      { id: "s1", kind: "ai", name: "Draft a reply", enabled: true, config: { agent: "none", model: "sawala-pro", instruction: "Draft a warm, concise reply to the customer's message.", input: "{{trigger.message}}" } },
      { id: "s2", kind: "connect_reply", name: "Reply into Connect", enabled: true, config: { message: "{{steps.s1.output}}" } },
    ],
    lastRun: { status: "succeeded", when: "ran 12m ago" },
    runs: [
      {
        id: "r1",
        kind: "triggered",
        status: "succeeded",
        startedAt: "12m ago",
        label: "WhatsApp · +62 812-3456-7890",
        trace: [
          { stepId: "s1", name: "Draft a reply", kind: "ai", status: "succeeded", output: "Hi! Thanks for reaching out — happy to help, what would you like to know?" },
          { stepId: "s2", name: "Reply into Connect", kind: "connect_reply", status: "succeeded", output: "Delivered to +62 812-3456-7890" },
        ],
      },
      { id: "r2", kind: "triggered", status: "succeeded", startedAt: "3h ago", label: "WhatsApp · +62 813-1111-2222" },
      { id: "r3", kind: "simulated", status: "succeeded", startedAt: "1d ago", label: "Simulated run" },
    ],
  },
  {
    id: "f2",
    name: "Weekly usage digest",
    description: "Send a weekly summary of chat and knowledge usage.",
    enabled: true,
    trigger: { kind: "cron", cronExpr: "0 8 * * 1", timezone: "Asia/Jakarta" },
    steps: [
      { id: "s1", kind: "ai", name: "Summarize usage", enabled: true, config: { agent: "none", model: "sawala-pro", instruction: "Summarize this week's chat and knowledge base usage.", input: "" } },
      { id: "s2", kind: "notify_staff", name: "Notify staff", enabled: true, config: { subject: "Weekly usage digest", message: "{{steps.s1.output}}" } },
    ],
    lastRun: { status: "succeeded", when: "ran 3d ago" },
    runs: [
      { id: "r1", kind: "triggered", status: "succeeded", startedAt: "3d ago", label: "cron 0 8 * * 1" },
      { id: "r2", kind: "triggered", status: "succeeded", startedAt: "10d ago", label: "cron 0 8 * * 1" },
    ],
  },
  {
    id: "f3",
    name: "Escalate unresolved tickets",
    description: "Notify staff when a ticket sits unresolved for too long.",
    enabled: false,
    trigger: { kind: "manual" },
    steps: [
      { id: "s1", kind: "branch", name: "Check ticket age", enabled: true, config: { left: "{{trigger.ticketAgeHours}}", operator: "gt", right: "24" } },
      { id: "s2", kind: "notify_staff", name: "Notify staff", enabled: true, config: { subject: "Unresolved ticket", message: "A ticket has been open for over 24 hours." } },
      { id: "s3", kind: "datana_push", name: "Write to Datana", enabled: false, config: { collectionSlug: "escalations", data: "{{trigger}}", status: "draft" } },
    ],
    lastRun: { status: "failed", when: "failed 1d ago" },
    runs: [
      {
        id: "r1",
        kind: "test",
        status: "failed",
        startedAt: "1d ago",
        label: "Test run",
        trace: [
          { stepId: "s1", name: "Check ticket age", kind: "branch", status: "succeeded", output: "true" },
          { stepId: "s2", name: "Notify staff", kind: "notify_staff", status: "failed", error: "No staff channel configured." },
          { stepId: "s3", name: "Write to Datana", kind: "datana_push", status: "skipped" },
        ],
      },
    ],
  },
]

const STORAGE_KEY = "ajena-workflows"

function loadWorkflows(): WorkflowSummary[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as WorkflowSummary[]
  } catch {
    // Malformed or inaccessible storage — fall back to the seed data below.
  }
  return initialWorkflows
}

export function usePersistedWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>(loadWorkflows)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
    } catch {
      // Storage full or blocked (private mode) — state still works in-memory
      // for the rest of this tab's session.
    }
  }, [workflows])

  return [workflows, setWorkflows] as const
}

export function nextStepId(steps: WorkflowStep[]): string {
  let n = steps.length + 1
  const existing = new Set(steps.map((s) => s.id))
  while (existing.has(`s${n}`)) n++
  return `s${n}`
}
