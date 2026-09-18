import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CircleCheckBig,
  CloudUpload,
  FileText,
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
import type { KbMode } from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { cn } from "@/lib/utils"

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const ACCEPTED_EXTENSIONS =
  ".md,.markdown,.txt,.json,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"

type RowStatus = "queued" | "uploading" | "done" | "error"

interface UploadRow {
  id: string
  file: File
  status: RowStatus
  progress: number
  errorMsg?: string
}

export interface UploadedDocument {
  title: string
  fileType: string
  size: string
  scope: string
  extraScopes?: string[]
  groupId?: string
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

function validateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Exceeds 4 MB limit (${formatBytes(file.size)})`
  }
  return null
}

export function UploadDocumentDialog({
  mode,
  open,
  onOpenChange,
  onUploaded,
}: {
  mode: KbMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: (docs: UploadedDocument[]) => void
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
          onClose={() => onOpenChange(false)}
          onUploaded={onUploaded}
        />
      </DialogContent>
    </Dialog>
  )
}

function UploadForm({
  onClose,
  onUploaded,
}: {
  onClose: () => void
  onUploaded: (docs: UploadedDocument[]) => void
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

  function addFiles(files: FileList | File[]) {
    const next: UploadRow[] = []
    for (const file of Array.from(files)) {
      const err = validateFile(file)
      next.push({
        id: crypto.randomUUID(),
        file,
        status: err ? "error" : "queued",
        progress: 0,
        errorMsg: err ?? undefined,
      })
    }
    if (next.length > 0) setRows((prev) => [...prev, ...next])
  }

  // Simulated upload: no backend behind this prototype yet, so each queued
  // row just animates a progress bar to completion instead of doing a real
  // network transfer.
  useEffect(() => {
    for (const row of rows) {
      if (row.status !== "queued") continue
      if (inFlightRef.current.has(row.id)) continue
      inFlightRef.current.add(row.id)
      updateRow(row.id, { status: "uploading", progress: 0 })

      let pct = 0
      const timer = setInterval(() => {
        pct = Math.min(100, pct + 20 + Math.random() * 20)
        if (pct >= 100) {
          clearInterval(timer)
          updateRow(row.id, { status: "done", progress: 100 })
          inFlightRef.current.delete(row.id)
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

  function retryRow(id: string) {
    updateRow(id, { status: "queued", progress: 0, errorMsg: undefined })
  }

  const doneCount = useMemo(
    () => rows.filter((r) => r.status === "done").length,
    [rows],
  )
  const hasUploading = rows.some(
    (r) => r.status === "uploading" || r.status === "queued",
  )

  function handleDone() {
    const scopeFields = resolveScopeFields(scope, groups)
    const docs: UploadedDocument[] = rows
      .filter((r) => r.status === "done")
      .map((r) => ({
        title: r.file.name.replace(/\.[^.]+$/, ""),
        fileType: fileTypeFromName(r.file.name),
        size: formatBytes(r.file.size),
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
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        onChange={onInputChange}
      />

      <AgentScopeControl value={scope} onChange={setScope} />

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

      {rows.length > 0 && (
        <ul className="flex max-h-60 flex-col divide-y overflow-y-auto rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(row.file.size)}
                    {row.status === "uploading" && ` · ${row.progress}%`}
                    {row.status === "done" && " · Uploaded"}
                    {row.status === "queued" && " · Queued"}
                    {(row.status === "error" || row.errorMsg) && row.errorMsg
                      ? ` · ${row.errorMsg}`
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
                  {row.status === "error" && (
                    <>
                      <AlertCircle className="size-4 text-destructive" />
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
            disabled={rows.length === 0 || hasUploading}
            onClick={handleDone}
          >
            Done
          </Button>
        </div>
      </div>
    </>
  )
}
