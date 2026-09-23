import { useState } from "react"
import { ArrowLeft, Bot, FileText, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { type KnowledgeDocument, formatDocDate, statusStyles, usePersistedDocuments } from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { usePersistedSettings } from "@/lib/settings-data"
import { cn } from "@/lib/utils"

const LIST_HREF = "/connect/knowledge?tab=groups"

// Variant D: one group's own page — rename or delete it, and manage which
// agents use it and which documents belong to it. A document belongs to at
// most one group, so adding one that's in another group moves it here, and
// removing one sends it back to General.
export function KnowledgeGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { groups, setGroups, touchGroups } = useKnowledgeVariant()
  const [documents, setDocuments] = usePersistedDocuments()
  const [settings] = usePersistedSettings()
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addDocsOpen, setAddDocsOpen] = useState(false)

  const group = groups.find((g) => g.id === groupId)

  if (!group) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">Group not found.</p>
          <p className="mt-1 text-xs text-muted-foreground">It may have been deleted, or the link may be wrong.</p>
          <Link to={LIST_HREF} className="mt-3 inline-block text-xs text-primary hover:underline">
            ← Back to groups
          </Link>
        </div>
      </div>
    )
  }

  const groupDocs = documents.filter((d) => d.groupId === group.id)
  const agentRoster = settings.connectAgents.filter((a) => a.enabled)
  const addableAgents = agentRoster.filter((a) => !group.agents.includes(a.label))

  function updateGroup(patch: Partial<{ name: string; agents: string[] }>) {
    setGroups((prev) => prev.map((g) => (g.id === group!.id ? { ...g, ...patch } : g)))
  }

  function saveName() {
    const name = nameDraft.trim()
    if (name && name !== group!.name) {
      updateGroup({ name })
      // Grouped documents carry the group's name as their scope label.
      setDocuments((prev) => prev.map((d) => (d.groupId === group!.id ? { ...d, scope: name } : d)))
    }
    setRenaming(false)
  }

  function removeDocument(id: string) {
    touchGroups([group!.id])
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, groupId: undefined, scope: "General", extraScopes: undefined } : d)),
    )
  }

  function addDocuments(ids: string[]) {
    const set = new Set(ids)
    // The groups those documents leave change too.
    touchGroups([group!.id, ...documents.filter((d) => set.has(d.id)).map((d) => d.groupId)])
    setDocuments((prev) =>
      prev.map((d) => (set.has(d.id) ? { ...d, groupId: group!.id, scope: group!.name, extraScopes: undefined } : d)),
    )
    setAddDocsOpen(false)
  }

  function deleteGroup() {
    setGroups((prev) => prev.filter((g) => g.id !== group!.id))
    setDocuments((prev) =>
      prev.map((d) => (d.groupId === group!.id ? { ...d, groupId: undefined, scope: "General" } : d)),
    )
    navigate(LIST_HREF)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to={LIST_HREF}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to groups"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            {renaming ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveName()
                }}
              >
                <Input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
                  maxLength={60}
                  className="h-8 max-w-xs text-sm"
                />
                <Button type="submit" size="sm" disabled={nameDraft.trim() === ""}>
                  Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <h1 className="truncate text-sm font-semibold">{group.name}</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>Created at {formatDocDate(group.createdAt, true)}</span>
                  <span className="text-border">|</span>
                  <span>Modified at {formatDocDate(group.updatedAt, true)}</span>
                  <span className="text-border">|</span>
                  <span>
                    {groupDocs.length} {groupDocs.length === 1 ? "document" : "documents"}
                  </span>
                </p>
              </>
            )}
          </div>
          {!renaming && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setNameDraft(group.name)
                  setRenaming(true)
                }}
              >
                <Pencil className="size-3.5" />
                Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
          <section className="flex flex-col rounded-xl border">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Agents ({group.agents.length})</h2>
                <p className="text-xs text-muted-foreground">These agents can answer from every document in this group.</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={addableAgents.length === 0}>
                    <Plus className="size-3.5" />
                    Add agent
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {addableAgents.map((a) => (
                    <DropdownMenuItem
                      key={a.agentKey}
                      onSelect={() => updateGroup({ agents: [...group.agents, a.label] })}
                    >
                      <Bot className="size-3.5" />
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {group.agents.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No agents yet — documents in this group aren't used by any agent.
              </p>
            ) : (
              <ul className="divide-y">
                {group.agents.map((label) => {
                  const agent = agentRoster.find((a) => a.label === label)
                  return (
                    <li key={label} className="flex items-center gap-3 px-4 py-2.5">
                      <Bot className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{label}</p>
                        {agent?.description && (
                          <p className="truncate text-xs text-muted-foreground">{agent.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => updateGroup({ agents: group.agents.filter((a) => a !== label) })}
                      >
                        <X className="size-3.5" />
                        Remove
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="flex flex-col rounded-xl border">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Documents ({groupDocs.length})</h2>
                <p className="text-xs text-muted-foreground">
                  A document belongs to one group. Removing it here moves it back to General.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAddDocsOpen(true)}>
                <Plus className="size-3.5" />
                Add documents
              </Button>
            </div>
            {groupDocs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No documents in this group yet.</p>
            ) : (
              <ul className="divide-y">
                {groupDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <Link
                      to={`/connect/knowledge/${d.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                    >
                      {d.name}
                    </Link>
                    <Badge className={cn("shrink-0", statusStyles[d.status])}>{d.status}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDocument(d.id)}
                    >
                      <X className="size-3.5" />
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <AddDocumentsDialog
        open={addDocsOpen}
        onOpenChange={setAddDocsOpen}
        groupId={group.id}
        documents={documents}
        onAdd={addDocuments}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Delete “{group.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {groupDocs.length} document(s) move back to General, and its agents lose access to them through this
              group. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={deleteGroup}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddDocumentsDialog({
  open,
  onOpenChange,
  groupId,
  documents,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  documents: KnowledgeDocument[]
  onAdd: (ids: string[]) => void
}) {
  const { groups } = useKnowledgeVariant()
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const q = query.trim().toLowerCase()
  const candidates = documents.filter((d) => d.groupId !== groupId && (!q || d.name.toLowerCase().includes(q)))
  const movingCount = documents.filter((d) => picked.has(d.id) && d.groupId).length

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("")
      setPicked(new Set())
    }
    onOpenChange(next)
  }

  function toggle(id: string, checked: boolean) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add documents</DialogTitle>
          <DialogDescription>Documents already in another group will move to this one.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" className="pr-8" />
          <Search className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <ul className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-lg border">
          {candidates.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">No documents to add.</li>
          )}
          {candidates.map((d) => {
            const currentGroup = d.groupId ? groups.find((g) => g.id === d.groupId) : undefined
            return (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                  <Checkbox checked={picked.has(d.id)} onCheckedChange={(c) => toggle(d.id, c === true)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{d.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {currentGroup ? `Currently in ${currentGroup.name}` : "General"}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {movingCount > 0 && `${movingCount} will move from another group`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={picked.size === 0}
              onClick={() => {
                onAdd([...picked])
                handleOpenChange(false)
              }}
            >
              Add {picked.size > 0 ? picked.size : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
