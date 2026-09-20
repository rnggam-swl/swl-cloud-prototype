import { useState } from "react"
import {
  Bot,
  BookOpen,
  ChevronDown,
  CloudUpload,
  Layers,
  ListFilter,
  Pencil,
  PenLine,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ManageAccessDialog } from "@/components/manage-access-dialog"
import { ManageGroupsDialog } from "@/components/manage-groups-dialog"
import {
  type UploadedDocument,
  UploadDocumentDialog,
} from "@/components/upload-document-dialog"
import { VariantSwitcher } from "@/components/variant-switcher"
import {
  type NewDocumentDraft,
  WriteDocumentDialog,
} from "@/components/write-document-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  type KbMode,
  type KnowledgeDocument,
  modeCopy,
  statusStyles,
  usePersistedDocuments,
} from "@/lib/knowledge-data"
import {
  type KbVariant,
  type KnowledgeGroup,
  useKnowledgeVariant,
} from "@/lib/knowledge-variant"
import { usePersistedSettings } from "@/lib/settings-data"

function MetaSeparator() {
  return <span className="text-border">|</span>
}

/** Who-can-see-this tag for a document row. Variant C is groups-based, so it
 * always uses the group icon and hover text, even for ungrouped ("General")
 * documents — Variant A/B are agent-based, so they keep the agent icon and
 * list every agent with access (including the primary scope, not just the
 * "extra" ones) so the hover is a complete answer, not a partial one. */
function DocScopeTag({
  doc,
  variant,
  groups,
  agentLabels,
}: {
  doc: KnowledgeDocument
  variant: KbVariant
  groups: KnowledgeGroup[]
  agentLabels: string[]
}) {
  const isGrouped = variant === "c" && !!doc.groupId
  const group = isGrouped ? groups.find((g) => g.id === doc.groupId) : undefined
  const isGeneral = doc.scope === "General" && !isGrouped
  const Icon = variant === "c" ? Layers : Bot

  const hoverTitle = isGrouped
    ? "Agents in this group"
    : isGeneral
      ? "Visible to all agents"
      : "Agents with access"
  const hoverAgents = isGrouped
    ? (group?.agents ?? [])
    : isGeneral
      ? agentLabels
      : [doc.scope, ...(doc.extraScopes ?? [])]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1 underline decoration-dotted underline-offset-2">
          <Icon className="size-3" />
          {isGrouped ? (group?.name ?? doc.scope) : doc.scope}
          {!isGrouped && doc.extraScopes ? ` +${doc.extraScopes.length}` : ""}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="flex flex-col">
          <span className="font-medium">{hoverTitle}</span>
          {hoverAgents.map((agent) => (
            <span key={agent}>{agent}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function KnowledgeBasePage({ mode }: { mode: KbMode }) {
  const copy = modeCopy[mode]
  const { variant, groups } = useKnowledgeVariant()
  const [settings] = usePersistedSettings()
  const [documents, setDocuments] = usePersistedDocuments()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [writeOpen, setWriteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [accessDoc, setAccessDoc] = useState<KnowledgeDocument | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<string | null>(null)

  const agentLabels = settings.connectAgents.filter((a) => a.enabled).map((a) => a.label)

  const visibleDocuments = scopeFilter
    ? documents.filter((d) => {
        if (d.groupId) return (groups.find((g) => g.id === d.groupId)?.agents ?? []).includes(scopeFilter)
        return d.scope === scopeFilter || (d.extraScopes ?? []).includes(scopeFilter)
      })
    : documents

  const selectedCount = selectedIds.size
  const allSelected = selectedCount > 0 && selectedCount === visibleDocuments.length
  const headerChecked: boolean | "indeterminate" = allSelected
    ? true
    : selectedCount > 0
      ? "indeterminate"
      : false

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visibleDocuments.map((d) => d.id)) : new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function confirmDelete() {
    setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)))
    setSelectedIds(new Set())
    setConfirmOpen(false)
  }

  function requestDeleteOne(id: string) {
    setSelectedIds(new Set([id]))
    setConfirmOpen(true)
  }

  function retryDocument(id: string) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "Queued" } : d)),
    )
  }

  function openManageAccess(doc: KnowledgeDocument) {
    setAccessDoc(doc)
    setAccessOpen(true)
  }

  function handleGroupDeleted(groupId: string) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.groupId === groupId
          ? { ...d, groupId: undefined, scope: "General" }
          : d,
      ),
    )
  }

  function saveAccess(id: string, agents: string[]) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              scope: agents.length === 0 ? "General" : agents[0],
              extraScopes: agents.length > 1 ? agents.slice(1) : undefined,
            }
          : d,
      ),
    )
  }

  function handleCreate(draft: NewDocumentDraft) {
    const bytes = new TextEncoder().encode(draft.body).byteLength
    const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    setDocuments((prev) => [
      {
        id: `doc-${Date.now()}`,
        name: draft.title,
        status: "Queued",
        fileType: draft.format === "md" ? "MD" : "TXT",
        size,
        date,
        scope: draft.scope,
        extraScopes: draft.extraScopes,
        groupId: draft.groupId,
        editable: true,
        content: draft.body,
      },
      ...prev,
    ])
    setWriteOpen(false)
  }

  function handleUploaded(uploaded: UploadedDocument[]) {
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    setDocuments((prev) => [
      ...uploaded.map((u) => ({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: u.title,
        status: "Queued" as const,
        fileType: u.fileType,
        size: u.size,
        date,
        scope: u.scope,
        extraScopes: u.extraScopes,
        groupId: u.groupId,
        editable: u.fileType === "MD" || u.fileType === "TXT",
      })),
      ...prev,
    ])
    setUploadOpen(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col gap-6 px-6 py-6">
        <div className="-mx-6 flex flex-col gap-1 border-b px-6 pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Knowledge base</h1>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] font-medium tracking-wide uppercase ${copy.badgeClass}`}
            >
              {copy.badge}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>

        <section className="flex flex-col gap-4 rounded-xl border p-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 shrink-0" />
              <h2 className="text-sm font-semibold">Add Knowledge</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a file — Markdown, plain text, JSON, PDF, or Office docs
              up to 4 MB — or write one here directly. AI Search
              auto-extracts and indexes content within ~5–30 seconds.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setUploadOpen(true)}
            >
              <CloudUpload className="size-4" />
              Upload Document
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setWriteOpen(true)}
            >
              <PenLine className="size-4" />
              Write a Document
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-xl border">
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <Checkbox
              checked={headerChecked}
              onCheckedChange={(checked) => toggleAll(checked === true)}
              aria-label={
                selectedCount === 0 ? "Select all documents" : "Clear selection"
              }
            />
            <h2 className="text-sm font-semibold">
              Documents ({visibleDocuments.length})
            </h2>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {selectedCount > 0 && (
                <Button
                  size="lg"
                  onClick={() => setConfirmOpen(true)}
                  className="border-transparent bg-destructive text-white hover:bg-destructive/90"
                >
                  <Trash2 className="size-4" />
                  Delete ({selectedCount})
                </Button>
              )}

              <div className="relative">
                <Input
                  placeholder="Search..."
                  className="h-9 w-48 pr-8 text-sm"
                />
                <Search className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>

              {mode === "connect" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="lg">
                      <Bot className="size-4" />
                      {scopeFilter ?? "General (All Agents)"}
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setScopeFilter(null)}>
                      General (All Agents)
                    </DropdownMenuItem>
                    {agentLabels.map((agent) => (
                      <DropdownMenuItem key={agent} onSelect={() => setScopeFilter(agent)}>
                        {agent}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {mode === "connect" && variant === "c" && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setGroupsOpen(true)}
                >
                  <Layers className="size-3.5" />
                  Manage Groups
                </Button>
              )}

              <Button variant="outline" size="lg">
                <ListFilter className="size-3.5" />
                Sort
              </Button>
              <Button variant="outline" size="lg">
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col divide-y">
            {visibleDocuments.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No documents scoped to {scopeFilter}.
              </p>
            )}
            {visibleDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <Checkbox
                  checked={selectedIds.has(doc.id)}
                  onCheckedChange={(checked) =>
                    toggleOne(doc.id, checked === true)
                  }
                  aria-label={`Select ${doc.name}`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/${mode}/knowledge/${doc.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {doc.name}
                    </Link>
                    <Badge className={statusStyles[doc.status]}>
                      {doc.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                      {doc.fileType}
                    </span>
                    <MetaSeparator />
                    <span>{doc.size}</span>
                    <MetaSeparator />
                    <span>{doc.date}</span>
                    {mode === "connect" && (
                      <>
                        <MetaSeparator />
                        <DocScopeTag
                          doc={doc}
                          variant={variant}
                          groups={groups}
                          agentLabels={agentLabels}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {doc.status === "Failed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => retryDocument(doc.id)}
                    >
                      <RotateCcw className="size-3.5" />
                      Retry
                    </Button>
                  )}
                  {doc.editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  )}
                  {mode === "connect" && variant === "b" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openManageAccess(doc)}
                    >
                      <Users className="size-3.5" />
                      Manage Access
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => requestDeleteOne(doc.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {selectedCount === 1 ? "document" : "documents"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected{" "}
              {selectedCount === 1 ? "document" : "documents"} from this
              knowledge base, and the assistant will stop using{" "}
              {selectedCount === 1 ? "it" : "them"} to answer. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WriteDocumentDialog
        mode={mode}
        open={writeOpen}
        onOpenChange={setWriteOpen}
        onCreate={handleCreate}
      />

      <UploadDocumentDialog
        mode={mode}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleUploaded}
      />

      <ManageAccessDialog
        doc={accessDoc}
        open={accessOpen}
        onOpenChange={setAccessOpen}
        onSave={saveAccess}
      />

      <ManageGroupsDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        onDeleteGroup={handleGroupDeleted}
      />

      {mode === "connect" && <VariantSwitcher />}
    </div>
  )
}
