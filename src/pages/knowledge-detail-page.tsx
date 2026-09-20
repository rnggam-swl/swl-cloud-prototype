import { useState } from "react"
import { ArrowLeft, Download, FileWarning, Pencil, Users } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { DocScopeTag, MetaSeparator } from "@/components/knowledge-meta"
import { ManageAccessDialog, type AccessSaveFields } from "@/components/manage-access-dialog"
import { MarkdownLite } from "@/components/markdown-lite"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  type KbMode,
  type KnowledgeDocument,
  modeCopy,
  statusStyles,
  usePersistedDocuments,
} from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { cn } from "@/lib/utils"

export function KnowledgeDetailPage({ mode }: { mode: KbMode }) {
  const { itemId } = useParams<{ itemId: string }>()
  const listHref = modeCopy[mode].listHref
  const { variant, groups } = useKnowledgeVariant()
  const [documents, setDocuments] = usePersistedDocuments()
  const [accessOpen, setAccessOpen] = useState(false)
  const doc = documents.find((d) => d.id === itemId)

  function saveAccess(id: string, fields: AccessSaveFields) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)))
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
            {doc.editable && (
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to={listHref}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
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
          <DocumentPreview doc={doc} />
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
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <FileWarning className="mx-auto size-6 text-destructive" />
        <p className="mt-2 text-sm">
          This document failed to process and could not be indexed.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Retry indexing from the knowledge base list, or download the
          original file below.
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
