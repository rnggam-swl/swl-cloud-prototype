import type { FailureReasonCode } from "@/lib/knowledge-data"

// Demo scaffolding. Most upload failures can only be detected by a backend
// that actually parses the file — a corrupted PDF, a scanned page with no
// text layer, a near-duplicate of something already indexed. There is no
// such backend behind this prototype, so these scripted "files" stand in for
// them: picking one runs the real UI end to end (upload row, progress bar,
// error copy, list row, detail page) without a real file ever being read.
//
// Delete this file once a real upload/indexing API exists.

export interface UploadScenario {
  id: string
  /** Shown in the picker — describes the condition, not the file. */
  label: string
  name: string
  bytes: number
  /** Where the scripted failure lands. Omitted means it indexes cleanly.
   * Scenarios caught by the dialog's own client-side validation (too large,
   * wrong type, empty, duplicate name) leave this unset too — the real
   * validation rejects them before any of this is consulted. */
  failStage?: "upload" | "processing"
  reason?: FailureReasonCode
}

export interface ScenarioGroup {
  label: string
  scenarios: UploadScenario[]
}

const KB = 1024
const MB = 1024 * 1024

export const SCENARIO_GROUPS: ScenarioGroup[] = [
  {
    // Caught client-side before the upload even starts — these run through
    // the dialog's real validation, nothing here is scripted.
    label: "Rejected before upload",
    scenarios: [
      { id: "too-large", label: "Over the 4 MB limit", name: "Training Transcript.pdf", bytes: Math.round(6.2 * MB) },
      { id: "bad-type", label: "Unsupported file type", name: "Assets Archive.zip", bytes: Math.round(1.4 * MB) },
      { id: "empty", label: "Empty file", name: "Blank Notes.txt", bytes: 0 },
    ],
  },
  {
    // Also real client-side checks: the dialog asks whether to replace the
    // existing document, keep both, or skip.
    label: "Name already exists",
    scenarios: [
      { id: "dupe-name", label: "Same name as an indexed document", name: "SOP Test Case Sawala.pdf", bytes: Math.round(1.3 * MB) },
      { id: "dupe-name-busy", label: "Same name as a document still indexing", name: "THE EFFECTS OF MOBILE SERVICE QUALITIES ON CUSTOMER REUSE INTENTION OF GOJEK SUPER APP.pdf", bytes: Math.round(2.1 * MB) },
    ],
  },
  {
    label: "Fails during upload",
    scenarios: [
      { id: "net", label: "Connection lost mid-upload", name: "Company Handbook.pdf", bytes: Math.round(2.4 * MB), failStage: "upload", reason: "upload_network_error" },
      { id: "timeout", label: "Upload timed out", name: "Product Catalog 2026.pdf", bytes: Math.round(3.8 * MB), failStage: "upload", reason: "upload_timeout" },
      { id: "server", label: "Server unavailable", name: "Pricing Sheet.xlsx", bytes: Math.round(820 * KB), failStage: "upload", reason: "upload_server_error" },
    ],
  },
  {
    label: "Fails during indexing",
    scenarios: [
      { id: "corrupt", label: "Corrupted file", name: "Quarterly Report.pdf", bytes: Math.round(1.6 * MB), failStage: "processing", reason: "file_corrupt" },
      { id: "locked", label: "Password-protected", name: "Employee Contracts.docx", bytes: Math.round(640 * KB), failStage: "processing", reason: "file_password_protected" },
      { id: "scanned", label: "Scanned pages, no text layer", name: "Signed Agreement (scan).pdf", bytes: Math.round(3.1 * MB), failStage: "processing", reason: "no_extractable_text" },
      { id: "encoding", label: "Unreadable text encoding", name: "Legacy Notes.txt", bytes: Math.round(48 * KB), failStage: "processing", reason: "encoding_error" },
      { id: "slow", label: "Too complex to finish processing", name: "Full Policy Manual.pdf", bytes: Math.round(3.9 * MB), failStage: "processing", reason: "processing_timeout" },
      { id: "dupe-content", label: "Near-duplicate of an existing document", name: "SOP Test Case (final v2).pdf", bytes: Math.round(1.2 * MB), failStage: "processing", reason: "duplicate_content" },
      { id: "service-down", label: "Indexing service unavailable", name: "Onboarding Guide.md", bytes: Math.round(32 * KB), failStage: "processing", reason: "indexing_service_unavailable" },
    ],
  },
  {
    label: "Happy path",
    scenarios: [
      { id: "ok", label: "Uploads and indexes cleanly", name: "Refund Policy.md", bytes: Math.round(18 * KB) },
    ],
  },
]
