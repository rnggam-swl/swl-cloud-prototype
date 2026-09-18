import { useMemo, useState } from "react"
import { AgentScopeControl, EMPTY_SCOPE, resolveScopeFields, type AgentScopeValue } from "@/components/agent-scope-control"
import { MarkdownLite } from "@/components/markdown-lite"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { KbMode } from "@/lib/knowledge-data"

// Mirrors MAX_TEXT_DOC_BYTES in services/ajena/src/server.ts — client-side
// enforcement is a courtesy so the operator sees the limit before saving.
const MAX_TEXT_DOC_BYTES = 256 * 1024

type TextDocFormat = "txt" | "md"

export interface NewDocumentDraft {
  title: string
  body: string
  format: TextDocFormat
  scope: string
  extraScopes?: string[]
  groupId?: string
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export function WriteDocumentDialog({
  mode,
  open,
  onOpenChange,
  onCreate,
}: {
  mode: KbMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (draft: NewDocumentDraft) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80vh] max-w-3xl flex-col gap-4 sm:max-w-3xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Write a document</DialogTitle>
          <DialogDescription>
            {mode === "connect"
              ? "Available to your external assistant, across the whole organization."
              : "Available to your internal chat, scoped to the active project."}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by `open` so every time the dialog is reopened for a new
            write, the form mounts fresh with empty state. */}
        <EditorForm
          key={String(open)}
          onClose={() => onOpenChange(false)}
          onCreate={onCreate}
        />
      </DialogContent>
    </Dialog>
  )
}

function EditorForm({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (draft: NewDocumentDraft) => void
}) {
  const { groups } = useKnowledgeVariant()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [format, setFormat] = useState<TextDocFormat>("txt")
  const [scope, setScope] = useState<AgentScopeValue>(EMPTY_SCOPE)
  const [tab, setTab] = useState<"write" | "preview">("write")

  const bytes = useMemo(() => byteLength(body), [body])
  const overLimit = bytes > MAX_TEXT_DOC_BYTES
  const dirty = title.trim().length > 0 || body.trim().length > 0

  function requestClose() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return
    onClose()
  }

  const canSave = title.trim().length > 0 && body.trim().length > 0 && !overLimit

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={500}
          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
        <Select value={format} onValueChange={(v) => setFormat(v as TextDocFormat)}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="txt">Plain text (.txt)</SelectItem>
            <SelectItem value="md">Markdown (.md)</SelectItem>
          </SelectContent>
        </Select>
        <AgentScopeControl value={scope} onChange={setScope} />
      </div>

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

      {tab === "write" ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            format === "md"
              ? "## Refunds\n\n- Requests accepted **within 7 days**."
              : "Type the knowledge you want the assistant to use…"
          }
          className="min-h-0 w-full flex-1 resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-card px-3 py-2">
          {body.trim().length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>
          ) : format === "md" ? (
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
              <MarkdownLite text={body} />
            </div>
          ) : (
            <pre className="text-foreground font-mono text-xs whitespace-pre-wrap break-words">
              {body}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span
          className={
            overLimit
              ? "text-[11px] font-medium text-destructive"
              : "text-[11px] text-muted-foreground"
          }
        >
          {formatBytes(bytes)} / {formatBytes(MAX_TEXT_DOC_BYTES)}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={requestClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            onClick={() =>
              onCreate({
                title: title.trim(),
                body,
                format,
                ...resolveScopeFields(scope, groups),
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </>
  )
}
