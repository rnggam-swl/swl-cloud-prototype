import { useEffect, useRef, useState } from "react"
import {
  Activity,
  BookOpen,
  Bot,
  CloudUpload,
  FileType,
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
import { Link, useSearchParams } from "react-router-dom"
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
import { ManageAccessDialog, type AccessSaveFields } from "@/components/manage-access-dialog"
import { KnowledgeGroupsTable } from "@/components/knowledge-groups-table"
import { ManageGroupsDialog } from "@/components/manage-groups-dialog"
import { DocScopeTag, MetaSeparator } from "@/components/knowledge-meta"
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FAILURE_REASON_COPY,
  type DocStatus,
  type KbMode,
  type KnowledgeDocument,
  modeCopy,
  statusStyles,
  formatDocDate,
  usePersistedDocuments,
} from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { usePersistedSettings } from "@/lib/settings-data"

const STATUS_OPTIONS: DocStatus[] = ["Queued", "Indexing", "Indexed", "Failed"]

// Sentinel for the "General (All Agents)" assignment filter option — distinct
// from real agent labels so it can be tracked in the same Set<string>.
const GENERAL_SCOPE = "__general__"

const STATUS_DOT_CLASS: Record<DocStatus, string> = {
  Queued: "bg-muted-foreground/40",
  Indexing: "bg-amber-500",
  Indexed: "bg-emerald-500",
  Failed: "bg-destructive",
}

export function KnowledgeBasePage({ mode }: { mode: KbMode }) {
  const copy = modeCopy[mode]
  const { variant, groups } = useKnowledgeVariant()
  const [settings] = usePersistedSettings()
  const [documents, setDocuments] = usePersistedDocuments()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // What the confirm dialog will delete — kept apart from the checkbox
  // selection so a row's own Delete button never touches the bulk selection.
  // Targets outlive the open flag so the dialog copy doesn't flicker while
  // it animates closed.
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function requestDelete(ids: string[]) {
    setDeleteTargetIds(ids)
    setDeleteOpen(true)
  }
  const [writeOpen, setWriteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [accessDoc, setAccessDoc] = useState<KnowledgeDocument | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)

  // Variant D moves group management onto its own tab. The tab lives in the
  // URL so returning from a group's detail page lands back on Groups.
  const showGroupsTab = mode === "connect" && variant === "d"
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get("tab") === "groups" ? "groups" : "knowledge"
  const setTab = (value: string) =>
    setSearchParams(value === "groups" ? { tab: "groups" } : {}, { replace: true })
  const [scopeFilter, setScopeFilter] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<DocStatus>>(new Set())
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())

  // Demo scaffolding: there is no indexing backend, so documents added in
  // this session are walked through Queued → Indexing → Indexed/Failed on a
  // timer. Only ids registered here move, which keeps the seeded rows (one
  // per status) parked as a static showcase of the four badge states.
  const pipelineRef = useRef<Set<string>>(new Set())
  const scheduledRef = useRef<Set<string>>(new Set())
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    for (const doc of documents) {
      if (!pipelineRef.current.has(doc.id)) continue
      if (doc.status !== "Queued" && doc.status !== "Indexing") continue
      const key = `${doc.id}:${doc.status}`
      if (scheduledRef.current.has(key)) continue
      scheduledRef.current.add(key)

      const isFinalHop = doc.status === "Indexing"
      const timer = setTimeout(() => {
        if (isFinalHop) pipelineRef.current.delete(doc.id)
        setDocuments((prev) =>
          prev.map((d) => {
            if (d.id !== doc.id) return d
            if (!isFinalHop) return { ...d, status: "Indexing" as const }
            return d.pendingFailure
              ? {
                  ...d,
                  status: "Failed" as const,
                  failureReason: d.pendingFailure,
                  pendingFailure: undefined,
                }
              : { ...d, status: "Indexed" as const }
          }),
        )
      }, isFinalHop ? 2200 : 1200)
      timersRef.current.push(timer)
    }
  }, [documents, setDocuments])

  const agentLabels = settings.connectAgents.filter((a) => a.enabled).map((a) => a.label)
  const typeOptions = Array.from(new Set(documents.map((d) => d.fileType))).sort()
  const hasActiveFilter = statusFilter.size > 0 || typeFilter.size > 0 || scopeFilter.size > 0
  const activeFilterCount =
    (statusFilter.size > 0 ? 1 : 0) + (typeFilter.size > 0 ? 1 : 0) + (scopeFilter.size > 0 ? 1 : 0)

  const visibleDocuments = documents.filter((d) => {
    if (statusFilter.size > 0 && !statusFilter.has(d.status)) return false
    if (typeFilter.size > 0 && !typeFilter.has(d.fileType)) return false
    // Assignment filter is AND-match: a document must satisfy every selected
    // agent (and/or the General criterion), not just one of them.
    for (const scope of scopeFilter) {
      if (scope === GENERAL_SCOPE) {
        if (d.scope !== "General" || d.groupId) return false
      } else if (d.groupId) {
        if (!(groups.find((g) => g.id === d.groupId)?.agents ?? []).includes(scope)) return false
      } else if (d.scope !== scope && !(d.extraScopes ?? []).includes(scope)) {
        return false
      }
    }
    return true
  })

  function toggleStatus(status: DocStatus, checked: boolean) {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (checked) next.add(status)
      else next.delete(status)
      return next
    })
  }

  function toggleType(type: string, checked: boolean) {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (checked) next.add(type)
      else next.delete(type)
      return next
    })
  }

  function toggleScope(scope: string, checked: boolean) {
    setScopeFilter((prev) => {
      const next = new Set(prev)
      if (checked) next.add(scope)
      else next.delete(scope)
      return next
    })
  }

  function clearFilters() {
    setStatusFilter(new Set())
    setTypeFilter(new Set())
    setScopeFilter(new Set())
  }

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

  const deleteCount = deleteTargetIds?.length ?? 0
  const deleteSingleName =
    deleteCount === 1 ? documents.find((d) => d.id === deleteTargetIds![0])?.name : undefined

  function confirmDelete() {
    if (!deleteTargetIds) return
    const targets = new Set(deleteTargetIds)
    setDocuments((prev) => prev.filter((d) => !targets.has(d.id)))
    // Drop deleted docs from the selection but keep anything else the user
    // had checked (a single-row delete leaves the bulk selection intact).
    setSelectedIds((prev) => new Set([...prev].filter((id) => !targets.has(id))))
    setDeleteOpen(false)
  }

  // (Re)enters a document into the demo pipeline. Clearing its scheduled
  // keys lets a document that already went through once this session (a
  // retry, or a replace-on-upload) be walked through again.
  function startPipeline(id: string) {
    for (const key of [...scheduledRef.current]) {
      if (key.startsWith(`${id}:`)) scheduledRef.current.delete(key)
    }
    pipelineRef.current.add(id)
  }

  function retryDocument(id: string) {
    startPipeline(id)
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "Queued", failureReason: undefined } : d,
      ),
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

  function saveAccess(id: string, fields: AccessSaveFields) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)))
  }

  function handleCreate(draft: NewDocumentDraft) {
    const bytes = new TextEncoder().encode(draft.body).byteLength
    const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
    const now = new Date().toISOString()

    const id = `doc-${Date.now()}`
    startPipeline(id)
    setDocuments((prev) => [
      {
        id,
        name: draft.title,
        status: "Queued",
        fileType: draft.format === "md" ? "MD" : "TXT",
        size,
        createdAt: now,
        updatedAt: now,
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
    const now = new Date().toISOString()

    // Replacing keeps the existing document's id, access/scope and createdAt,
    // swaps in the new file, bumps the version and sends it back through
    // indexing. Everything else is added as a new document.
    const replacements = new Map(
      uploaded.filter((u) => u.replaceId).map((u) => [u.replaceId!, u]),
    )
    const created: KnowledgeDocument[] = uploaded
      .filter((u) => !u.replaceId)
      .map((u) => ({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: u.title,
        status: "Queued" as const,
        fileType: u.fileType,
        size: u.size,
        createdAt: now,
        updatedAt: now,
        scope: u.scope,
        extraScopes: u.extraScopes,
        groupId: u.groupId,
        editable: u.fileType === "MD" || u.fileType === "TXT",
        pendingFailure: u.pendingFailure,
      }))

    for (const doc of created) startPipeline(doc.id)
    for (const id of replacements.keys()) startPipeline(id)
    setDocuments((prev) => [
      ...created,
      ...prev.map((d) => {
        const u = replacements.get(d.id)
        if (!u) return d
        return {
          ...d,
          status: "Queued" as const,
          fileType: u.fileType,
          size: u.size,
          updatedAt: now,
          version: (d.version ?? 1) + 1,
          editable: u.fileType === "MD" || u.fileType === "TXT",
          content: undefined,
          failureReason: undefined,
          pendingFailure: u.pendingFailure,
        }
      }),
    ])
    setUploadOpen(false)
  }

  const knowledgeTab = (
    <>
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
                onClick={() => requestDelete([...selectedIds])}
                className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              >
                <Trash2 className="size-4" />
                Delete ({selectedCount})
              </Button>
            )}

            {hasActiveFilter && (
              <Button variant="ghost" size="lg" onClick={clearFilters}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}

            <div className="relative">
              <Input
                placeholder="Search..."
                className="h-9 w-48 pr-8 text-sm"
              />
              <Search className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={activeFilterCount > 0 ? "secondary" : "outline"} size="lg">
                  <ListFilter className="size-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <Badge variant="outline" className="ml-0.5 px-1.5 py-0 text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Activity className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">Status</span>
                    {statusFilter.size > 0 && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {statusFilter.size}
                      </Badge>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={statusFilter.has(status)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => toggleStatus(status, checked === true)}
                      >
                        <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`} />
                        {status}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileType className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">Type</span>
                    {typeFilter.size > 0 && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {typeFilter.size}
                      </Badge>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    {typeOptions.map((type) => (
                      <DropdownMenuCheckboxItem
                        key={type}
                        checked={typeFilter.has(type)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => toggleType(type, checked === true)}
                      >
                        {type}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {mode === "connect" && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Bot className="size-3.5 text-muted-foreground" />
                      <span className="flex-1">Assignment</span>
                      {scopeFilter.size > 0 && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {scopeFilter.size}
                        </Badge>
                      )}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuCheckboxItem
                        checked={scopeFilter.has(GENERAL_SCOPE)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => toggleScope(GENERAL_SCOPE, checked === true)}
                      >
                        General (All Agents)
                      </DropdownMenuCheckboxItem>
                      {agentLabels.map((agent) => (
                        <DropdownMenuCheckboxItem
                          key={agent}
                          checked={scopeFilter.has(agent)}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={(checked) => toggleScope(agent, checked === true)}
                        >
                          {agent}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                {hasActiveFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={clearFilters}>Clear filters</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="lg">
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col divide-y">
          {visibleDocuments.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {hasActiveFilter
                ? "No documents match the selected filters."
                : "No documents yet."}
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
                  <span>Created at {formatDocDate(doc.createdAt)}</span>
                  <MetaSeparator />
                  <span>Modified at {formatDocDate(doc.updatedAt)}</span>
                  {mode === "connect" && (
                    <>
                      <MetaSeparator />
                      <DocScopeTag doc={doc} variant={variant} groups={groups} />
                    </>
                  )}
                </div>
                {doc.status === "Failed" && doc.failureReason && (
                  <p className="text-xs text-destructive">
                    {FAILURE_REASON_COPY[doc.failureReason].message}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {doc.status === "Failed" &&
                  (!doc.failureReason || FAILURE_REASON_COPY[doc.failureReason].retryable) && (
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
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Link to={`/${mode}/knowledge/${doc.id}`} state={{ autoEdit: true }}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Link>
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
                  onClick={() => requestDelete([doc.id])}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )

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

        {showGroupsTab ? (
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList>
              <TabsTrigger value="knowledge" className="px-3">
                <BookOpen />
                Knowledge
              </TabsTrigger>
              <TabsTrigger value="groups" className="px-3">
                <Layers />
                Groups
              </TabsTrigger>
            </TabsList>
            <TabsContent value="knowledge" className="flex flex-col gap-6">
              {knowledgeTab}
            </TabsContent>
            <TabsContent value="groups">
              <KnowledgeGroupsTable documents={documents} onDeleteGroup={handleGroupDeleted} />
            </TabsContent>
          </Tabs>
        ) : (
          knowledgeTab
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              {deleteSingleName
                ? `Delete “${deleteSingleName}”?`
                : `Delete ${deleteCount} ${deleteCount === 1 ? "document" : "documents"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteSingleName ? "this document" : `the selected ${deleteCount === 1 ? "document" : "documents"}`}{" "}
              from this knowledge base, and the assistant will stop using{" "}
              {deleteCount === 1 ? "it" : "them"} to answer. This cannot be
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
        existingDocuments={documents}
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
