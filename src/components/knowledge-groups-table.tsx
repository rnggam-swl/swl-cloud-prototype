import { useState } from "react"
import { Layers, Plus, Search, Trash2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatDocDate, type KnowledgeDocument } from "@/lib/knowledge-data"
import { type KnowledgeGroup, newGroupId, useKnowledgeVariant } from "@/lib/knowledge-variant"

export const GROUPS_HREF = "/connect/knowledge/groups"

// Variant D: groups get their own tab on the Connect knowledge page instead
// of the Manage Groups dialog. Each row opens a detail page where the
// group's agents and documents are managed.
export function KnowledgeGroupsTable({
  documents,
  onDeleteGroup,
}: {
  documents: KnowledgeDocument[]
  /** Falls the group's documents back to General — documents live in the page's state. */
  onDeleteGroup: (groupId: string) => void
}) {
  const { groups, setGroups } = useKnowledgeVariant()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [pendingDelete, setPendingDelete] = useState<KnowledgeGroup | null>(null)

  const docCount = (groupId: string) => documents.filter((d) => d.groupId === groupId).length
  const q = query.trim().toLowerCase()
  const visibleGroups = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q) || g.agents.some((a) => a.toLowerCase().includes(q)))
    : groups

  function createGroup() {
    const name = newName.trim()
    if (!name) return
    const id = newGroupId(name, groups)
    setGroups((prev) => [...prev, { id, name, agents: [] }])
    setCreateOpen(false)
    setNewName("")
    navigate(`${GROUPS_HREF}/${id}`)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    setGroups((prev) => prev.filter((g) => g.id !== pendingDelete.id))
    onDeleteGroup(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <section className="flex flex-col rounded-xl border">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Groups ({visibleGroups.length})</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 w-48 pr-8 text-sm"
            />
            <Search className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New group
          </Button>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {groups.length === 0
            ? "No groups yet. Create one to give agents a shared set of documents."
            : "No groups match your search."}
        </p>
      ) : (
        <ul className="divide-y">
          {visibleGroups.map((g) => {
            const count = docCount(g.id)
            return (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                <Layers className="size-4 shrink-0 self-start text-muted-foreground mt-0.5" />
                {/* Like the documents table, only the name opens the detail page. */}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Link to={`${GROUPS_HREF}/${g.id}`} className="w-fit max-w-full truncate text-sm font-medium hover:underline">
                    {g.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {g.agents.length === 0 ? (
                      <span>No agents assigned</span>
                    ) : (
                      g.agents.map((a) => (
                        <Badge key={a} variant="secondary" className="text-[10px]">
                          {a}
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <span>Created at {formatDocDate(g.createdAt)}</span>
                    <span className="text-border">|</span>
                    <span>Modified at {formatDocDate(g.updatedAt)}</span>
                    <span className="text-border">|</span>
                    <span>
                      {count} {count === 1 ? "document" : "documents"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingDelete(g)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setNewName("")
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>You can add agents and documents on the next page.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              createGroup()
            }}
          >
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name, e.g. Sales"
              maxLength={60}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={newName.trim() === ""}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {pendingDelete ? docCount(pendingDelete.id) : 0} document(s) move back to General, and its agents lose
              access to them through this group. This cannot be undone.
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
    </section>
  )
}
