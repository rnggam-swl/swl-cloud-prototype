import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  CircleCheckBig,
  CloudUpload,
  FileText,
  FlaskConical,
  LoaderCircle,
  RotateCw,
  X,
} from "lucide-react"
import { AgentScopeControl, EMPTY_SCOPE, resolveScopeFields, type AgentScopeValue } from "@/components/agent-scope-control"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FAILURE_REASON_COPY,
  type FailureReasonCode,
  type KbMode,
  type KnowledgeDocument,
} from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { SCENARIO_GROUPS, type UploadScenario } from "@/lib/upload-scenarios"
import { cn } from "@/lib/utils"

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [
  "md",
  "markdown",
  "txt",
  "json",
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
]
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",")

// "conflict" = same name as a document already in the knowledge base; the
// row waits there until the user picks replace / keep both / skip.
type RowStatus = "conflict" | "queued" | "uploading" | "done" | "error"
type ConflictResolution = "replace" | "keep"

// Rows only ever need a name and a byte count, so a simulated file and a real
// one are the same shape here — both travel the identical UI path.
interface UploadRow {
  id: string
  name: string
  bytes: number
  status: RowStatus
  progress: number
  reasonCode?: FailureReasonCode
  scenario?: UploadScenario
  /** The existing document this file's name collides with. */
  conflictWith?: KnowledgeDocument
  resolution?: ConflictResolution
  /** Title to save under when it differs from the file name ("keep both"). */
  saveAs?: string
}

export interface UploadedDocument {
  title: string
  fileType: string
  size: string
  scope: string
  extraScopes?: string[]
  groupId?: string
  pendingFailure?: FailureReasonCode
  /** Set when this upload replaces an existing document instead of adding one. */
  replaceId?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeFromName(name: string): string {
  const ext = name.split(".").pop()
  return ext ? ext.toUpperCase() : "FILE"
}

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "")
}

const titleKey = (title: string) => title.trim().toLowerCase()

// Client-side checks that don't need a backend: size, extension and empty
// content. Name collisions are handled separately in enqueue(). Simulated
// files go through this same function — nothing here reads file contents.
function validateFile(file: { name: string; bytes: number }): FailureReasonCode | null {
  if (file.bytes > MAX_UPLOAD_BYTES) return "file_too_large"
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (!ext || !ACCEPTED_EXTENSIONS.includes(ext)) return "unsupported_type"
  if (file.bytes === 0) return "empty_file"
  return null
}

// A document still going through indexing can't be replaced — that would
// start a second indexing run for the same document.
function isProcessing(doc: KnowledgeDocument) {
  return doc.status === "Queued" || doc.status === "Indexing"
}

// "SOP Test Case (2)", "(3)", ... — first number not already taken.
function uniqueTitle(base: string, taken: Set<string>): string {
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`
    if (!taken.has(titleKey(candidate))) return candidate
  }
}

export function UploadDocumentDialog({
  mode,
  open,
  onOpenChange,
  onUploaded,
  existingDocuments,
}: {
  mode: KbMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: (docs: UploadedDocument[]) => void
  /** Documents already in this knowledge base — used to catch name collisions. */
  existingDocuments: KnowledgeDocument[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-[600px] flex-col gap-4 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            {mode === "connect"
              ? "Available to your external assistant, across the whole organization."
              : "Available to your internal chat, scoped to the active project."}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by `open` so every reopen starts from a clean upload queue. */}
        <UploadForm
          key={String(open)}
          mode={mode}
          onClose={() => onOpenChange(false)}
          onUploaded={onUploaded}
          existingDocuments={existingDocuments}
        />
      </DialogContent>
    </Dialog>
  )
}

function UploadForm({
  mode,
  onClose,
  onUploaded,
  existingDocuments,
}: {
  mode: KbMode
  onClose: () => void
  onUploaded: (docs: UploadedDocument[]) => void
  existingDocuments: KnowledgeDocument[]
}) {
  const { groups } = useKnowledgeVariant()
  const inputRef = useRef<HTMLInputElement>(null)
  const inFlightRef = useRef<Set<string>>(new Set())
  const [rows, setRows] = useState<UploadRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [scope, setScope] = useState<AgentScopeValue>(EMPTY_SCOPE)

  const updateRow = (id: string, patch: Partial<UploadRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  // Title a row will be saved under — a "keep both" row saves renamed.
  const rowTitle = (r: UploadRow) => r.saveAs ?? titleFromFileName(r.name)

  function enqueue(incoming: { name: string; bytes: number; scenario?: UploadScenario }[]) {
    const batchTitles = new Set(rows.filter((r) => r.status !== "error").map((r) => titleKey(rowTitle(r))))
    const next: UploadRow[] = []
    for (const item of incoming) {
      const key = titleKey(titleFromFileName(item.name))
      const base = { id: crypto.randomUUID(), name: item.name, bytes: item.bytes, progress: 0, scenario: item.scenario }
      const invalid = validateFile(item)
      if (invalid) {
        next.push({ ...base, status: "error", reasonCode: invalid })
        continue
      }
      // Two files with the same name in one batch: nothing is saved yet to
      // replace, so the second one is simply rejected.
      if (batchTitles.has(key)) {
        next.push({ ...base, status: "error", reasonCode: "duplicate_name" })
        continue
      }
      batchTitles.add(key)
      const existing = existingDocuments.find((d) => titleKey(d.name) === key)
      next.push(existing ? { ...base, status: "conflict", conflictWith: existing } : { ...base, status: "queued" })
    }
    if (next.length > 0) setRows((prev) => [...prev, ...next])
  }

  function resolveConflicts(ids: string[], choice: ConflictResolution | "skip") {
    if (choice === "skip") {
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
      return
    }
    setRows((prev) => {
      const next = [...prev]
      for (const id of ids) {
        const i = next.findIndex((r) => r.id === id)
        const row = next[i]
        if (!row || row.status !== "conflict" || !row.conflictWith) continue
        if (choice === "replace") {
          if (isProcessing(row.conflictWith)) continue
          next[i] = { ...row, status: "queued", resolution: "replace" }
        } else {
          // Everything spoken for: existing documents plus the rest of this
          // batch (conflict rows still hold their original name).
          const taken = new Set(
            [
              ...existingDocuments.map((d) => d.name),
              ...next.filter((r) => r.id !== id && r.status !== "error").map(rowTitle),
            ].map(titleKey),
          )
          next[i] = { ...row, status: "queued", resolution: "keep", saveAs: uniqueTitle(titleFromFileName(row.name), taken) }
        }
      }
      return next
    })
  }

  function addFiles(files: FileList | File[]) {
    enqueue(Array.from(files).map((f) => ({ name: f.name, bytes: f.size })))
  }

  function addScenario(scenario: UploadScenario) {
    enqueue([{ name: scenario.name, bytes: scenario.bytes, scenario }])
  }

  // Simulated upload: no backend behind this prototype yet, so each queued
  // row just animates a progress bar instead of doing a real network
  // transfer. A row carrying an "upload" scenario stalls partway and fails
  // with that scenario's reason, so the interrupted-transfer cases (lost
  // connection, timeout, server down) can be shown without a server.
  useEffect(() => {
    for (const row of rows) {
      if (row.status !== "queued") continue
      if (inFlightRef.current.has(row.id)) continue
      inFlightRef.current.add(row.id)
      updateRow(row.id, { status: "uploading", progress: 0 })

      const failAt =
        row.scenario?.failStage === "upload" ? 40 + Math.random() * 30 : Infinity
      let pct = 0
      const timer = setInterval(() => {
        pct = Math.min(100, pct + 20 + Math.random() * 20)
        if (pct >= failAt) {
          clearInterval(timer)
          inFlightRef.current.delete(row.id)
          updateRow(row.id, {
            status: "error",
            progress: Math.round(failAt),
            reasonCode: row.scenario?.reason,
          })
        } else if (pct >= 100) {
          clearInterval(timer)
          inFlightRef.current.delete(row.id)
          updateRow(row.id, { status: "done", progress: 100 })
        } else {
          updateRow(row.id, { progress: Math.round(pct) })
        }
      }, 150)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ""
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  // Retrying drops the scripted failure: a second attempt at a dropped
  // connection is exactly the case where retry is supposed to work.
  function retryRow(id: string) {
    updateRow(id, { status: "queued", progress: 0, reasonCode: undefined, scenario: undefined })
  }

  const doneCount = useMemo(
    () => rows.filter((r) => r.status === "done").length,
    [rows],
  )
  const hasUploading = rows.some(
    (r) => r.status === "uploading" || r.status === "queued",
  )
  const conflictRows = rows.filter((r) => r.status === "conflict")

  function handleDone() {
    const scopeFields = resolveScopeFields(scope, groups)
    const docs: UploadedDocument[] = rows
      .filter((r) => r.status === "done")
      .map((r) => ({
        title: rowTitle(r),
        replaceId: r.resolution === "replace" ? r.conflictWith?.id : undefined,
        fileType: fileTypeFromName(r.name),
        size: formatBytes(r.bytes),
        pendingFailure:
          r.scenario?.failStage === "processing" ? r.scenario.reason : undefined,
        ...scopeFields,
      }))
    onUploaded(docs)
  }

  function handleCancel() {
    if (rows.length > 0 && !window.confirm("Discard the selected files?")) return
    onClose()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={onInputChange}
      />

      {mode === "connect" && <AgentScopeControl value={scope} onChange={setScope} />}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <CloudUpload className="size-5 text-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground">
            Markdown, Plain Text, JSON, PDF, or Office docs · Max 4 MB
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          Upload Files
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FlaskConical className="size-3.5 shrink-0" />
          Prototype — simulate a file condition instead of uploading a real one.
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="shrink-0">
              Pick a scenario
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {SCENARIO_GROUPS.map((group, i) => (
              <Fragment key={group.label}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </DropdownMenuLabel>
                {group.scenarios.map((scenario) => (
                  <DropdownMenuItem
                    key={scenario.id}
                    onSelect={() => addScenario(scenario)}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="text-sm">{scenario.label}</span>
                    <span className="text-[11px] text-muted-foreground">{scenario.name}</span>
                  </DropdownMenuItem>
                ))}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {conflictRows.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {conflictRows.length} files have the same name as existing documents.
          </p>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="xs" onClick={() => resolveConflicts(conflictRows.map((r) => r.id), "replace")}>
              Replace all
            </Button>
            <Button type="button" variant="outline" size="xs" onClick={() => resolveConflicts(conflictRows.map((r) => r.id), "keep")}>
              Keep all
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => resolveConflicts(conflictRows.map((r) => r.id), "skip")}>
              Skip all
            </Button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="flex max-h-60 flex-col divide-y overflow-y-auto rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(row.bytes)}
                    {row.status === "uploading" && ` · ${row.progress}%`}
                    {row.status === "done" && " · Uploaded"}
                    {row.status === "queued" && " · Queued"}
                    {row.status === "conflict" && " · A document with this name already exists"}
                    {row.resolution === "replace" && row.status !== "error" &&
                      ` · Replaces existing (v${(row.conflictWith?.version ?? 1) + 1})`}
                    {row.resolution === "keep" && row.status !== "error" && ` · Saved as “${row.saveAs}”`}
                    {row.status === "error" && row.reasonCode
                      ? ` · ${FAILURE_REASON_COPY[row.reasonCode].message}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {row.status === "uploading" && (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                  )}
                  {row.status === "done" && (
                    <CircleCheckBig className="size-4 text-emerald-500" />
                  )}
                  {row.status === "conflict" && (
                    <AlertTriangle className="size-4 text-amber-500" />
                  )}
                  {row.status === "error" && (
                    <>
                      <AlertCircle className="size-4 text-destructive" />
                      {(!row.reasonCode || FAILURE_REASON_COPY[row.reasonCode].retryable) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => retryRow(row.id)}
                          title="Retry"
                        >
                          <RotateCw />
                          <span className="sr-only">Retry</span>
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeRow(row.id)}
                    disabled={row.status === "uploading"}
                    title="Remove"
                  >
                    <X />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>

              {row.status === "conflict" && row.conflictWith && (
                <div className="flex flex-wrap items-center gap-1 pl-6.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={isProcessing(row.conflictWith)}
                    onClick={() => resolveConflicts([row.id], "replace")}
                  >
                    Replace
                  </Button>
                  <Button type="button" variant="outline" size="xs" onClick={() => resolveConflicts([row.id], "keep")}>
                    Keep both
                  </Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => resolveConflicts([row.id], "skip")}>
                    Skip
                  </Button>
                  {isProcessing(row.conflictWith) && (
                    <span className="text-[11px] text-muted-foreground">
                      Can’t replace while the existing document is still processing.
                    </span>
                  )}
                </div>
              )}

              {row.status === "uploading" && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {doneCount} of {rows.length} uploaded
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={rows.length === 0 || hasUploading || conflictRows.length > 0}
            onClick={handleDone}
          >
            Done
          </Button>
        </div>
      </div>
    </>
  )
}
