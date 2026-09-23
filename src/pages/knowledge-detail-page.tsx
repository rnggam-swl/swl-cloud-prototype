import { useState } from "react"
import { ArrowLeft, Download, FileWarning, Pencil, Users } from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"
import { DocScopeTag, MetaSeparator } from "@/components/knowledge-meta"
import { ManageAccessDialog, type AccessSaveFields } from "@/components/manage-access-dialog"
import { MarkdownLite } from "@/components/markdown-lite"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FAILURE_REASON_COPY,
  type KbMode,
  type KnowledgeDocument,
  modeCopy,
  statusStyles,
  usePersistedDocuments,
} from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { cn } from "@/lib/utils"

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export function KnowledgeDetailPage({ mode }: { mode: KbMode }) {
  const { itemId } = useParams<{ itemId: string }>()
  const location = useLocation()
  const listHref = modeCopy[mode].listHref
  const { variant, groups } = useKnowledgeVariant()
  const [documents, setDocuments] = usePersistedDocuments()
  const [accessOpen, setAccessOpen] = useState(false)
  const [editing, setEditing] = useState(
    () => Boolean((location.state as { autoEdit?: boolean } | null)?.autoEdit),
  )
  const doc = documents.find((d) => d.id === itemId)

  function saveAccess(id: string, fields: AccessSaveFields) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)))
  }

  function saveEdit(name: string, content: string) {
    if (!doc) return
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === doc.id ? { ...d, name, content, size: formatBytes(byteLength(content)) } : d,
      ),
    )
    setEditing(false)
  }

  if (!doc) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">Document not found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            It may have been deleted, or the link may be wrong.
          </p>
          <Link
            to={listHref}
            className="mt-3 inline-block text-xs text-primary hover:underline"
          >
            ← Back to knowledge base
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to={listHref}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to knowledge base"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-sm font-semibold">{doc.name}</h1>
              <Badge className={cn("shrink-0", statusStyles[doc.status])}>
                {doc.status}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{doc.fileType}</span>
              <MetaSeparator />
              <span>{doc.size}</span>
              <MetaSeparator />
              <span>{doc.date}</span>
              {mode === "connect" && (
                <>
                  <MetaSeparator />
                  <DocScopeTag doc={doc} variant={variant} groups={groups} />
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {doc.editable && !editing && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )}
            {mode === "connect" && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setAccessOpen(true)}
              >
                <Users className="size-3.5" />
                Manage Access
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="size-3.5" />
              Download original
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex h-full max-w-5xl flex-col gap-3 p-4">
          {editing ? (
            <DocumentEditor doc={doc} onCancel={() => setEditing(false)} onSave={saveEdit} />
          ) : (
            <DocumentPreview doc={doc} />
          )}
        </div>
      </main>

      <ManageAccessDialog
        doc={doc}
        open={accessOpen}
        onOpenChange={setAccessOpen}
        onSave={saveAccess}
      />
    </div>
  )
}

function DocumentPreview({ doc }: { doc: KnowledgeDocument }) {
  if (doc.status === "Failed") {
    const reason = doc.failureReason ? FAILURE_REASON_COPY[doc.failureReason] : undefined
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <FileWarning className="mx-auto size-6 text-destructive" />
        <p className="mt-2 text-sm">
          {reason?.message ?? "This document failed to process and could not be indexed."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {reason && !reason.retryable
            ? "Fix the file above, then delete this document and upload the corrected version."
            : "Retry indexing from the knowledge base list, or download the original file below."}
        </p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5">
          <Download className="size-3.5" />
          Download original
        </Button>
      </div>
    )
  }

  if (doc.fileType === "MD" && doc.content) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
        <MarkdownLite text={doc.content} />
      </div>
    )
  }

  if ((doc.fileType === "JSON" || doc.fileType === "TXT") && doc.content) {
    return (
      <pre className="overflow-x-auto rounded-md border bg-card p-4 font-mono text-xs whitespace-pre-wrap text-foreground">
        {doc.content}
      </pre>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-center">
      <p className="text-sm">This file type cannot be previewed in the browser.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Download it to open in the application it belongs to.
      </p>
      <Button variant="outline" size="sm" className="mt-3 gap-1.5">
        <Download className="size-3.5" />
        Download original
      </Button>
    </div>
  )
}

// In-place editor for MD/TXT documents — saves back onto the same document
// (same id, scope/group, status) instead of creating a new one.
function DocumentEditor({
  doc,
  onCancel,
  onSave,
}: {
  doc: KnowledgeDocument
  onCancel: () => void
  onSave: (name: string, content: string) => void
}) {
  const [name, setName] = useState(doc.name)
  const [body, setBody] = useState(doc.content ?? "")
  const [tab, setTab] = useState<"write" | "preview">("write")
  const isMd = doc.fileType === "MD"
  const dirty = name !== doc.name || body !== (doc.content ?? "")
  const canSave = name.trim().length > 0 && body.trim().length > 0

  function requestCancel() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return
    onCancel()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Title"
        maxLength={500}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
      />

      {isMd && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={tab === "write" ? "secondary" : "ghost"}
            onClick={() => setTab("write")}
          >
            Write
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "preview" ? "secondary" : "ghost"}
            onClick={() => setTab("preview")}
          >
            Preview
          </Button>
        </div>
      )}

      {isMd && tab === "preview" ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-card px-3 py-2">
          {body.trim().length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
              <MarkdownLite text={body} />
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-0 w-full flex-1 resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      )}

      <div className="flex shrink-0 items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={requestCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={() => onSave(name.trim(), body)}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
