import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type KnowledgeGroup,
  useKnowledgeVariant,
} from "@/lib/knowledge-variant"
import { usePersistedSettings } from "@/lib/settings-data"

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "group"
  )
}

// Variant C: the groups themselves are a first-class thing to manage, not
// just a fixed dropdown — create, rename, re-assign agents, or retire a
// group. Deleting one falls its documents back to General (handled by the
// page via `onDeleteGroup`, since documents live in that component's state).
export function ManageGroupsDialog({
  open,
  onOpenChange,
  onDeleteGroup,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleteGroup?: (groupId: string) => void
}) {
  const { groups, setGroups } = useKnowledgeVariant()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  function startEdit(id: string) {
    setCreating(false)
    setEditingId(id)
  }

  function cancelForm() {
    setEditingId(null)
    setCreating(false)
  }

  function saveGroup(data: { id?: string; name: string; agents: string[] }) {
    if (data.id) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === data.id ? { ...g, name: data.name, agents: data.agents } : g,
        ),
      )
    } else {
      const base = slugify(data.name)
      const existingIds = new Set(groups.map((g) => g.id))
      let id = base
      let n = 2
      while (existingIds.has(id)) {
        id = `${base}-${n++}`
      }
      setGroups((prev) => [...prev, { id, name: data.name, agents: data.agents }])
    }
    cancelForm()
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id))
    onDeleteGroup?.(id)
    if (editingId === id) cancelForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle>Manage knowledge groups</DialogTitle>
          <DialogDescription>
            Agents subscribe to one or more groups instead of individual documents.
            Deleting a group falls its documents back to General.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-lg border">
          {groups.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No groups yet.
            </p>
          )}
          {groups.map((g) =>
            editingId === g.id ? (
              <GroupForm
                key={g.id}
                initial={g}
                onCancel={cancelForm}
                onSave={saveGroup}
              />
            ) : (
              <div key={g.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {g.agents.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No agents assigned
                      </span>
                    ) : (
                      g.agents.map((a) => (
                        <Badge
                          key={a}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {a}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => startEdit(g.id)}
                  aria-label={`Edit ${g.name}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeGroup(g.id)}
                  aria-label={`Delete ${g.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ),
          )}
        </div>

        {creating ? (
          <GroupForm onCancel={cancelForm} onSave={saveGroup} />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              setEditingId(null)
              setCreating(true)
            }}
          >
            <Plus className="size-3.5" />
            New group
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GroupForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: KnowledgeGroup
  onCancel: () => void
  onSave: (data: { id?: string; name: string; agents: string[] }) => void
}) {
  const [settings] = usePersistedSettings()
  const agentLabels = settings.connectAgents.filter((a) => a.enabled).map((a) => a.label)
  const [name, setName] = useState(initial?.name ?? "")
  const [agents, setAgents] = useState<string[]>(initial?.agents ?? [])

  function toggle(agent: string, checked: boolean) {
    setAgents((prev) =>
      checked ? [...prev, agent] : prev.filter((a) => a !== agent),
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border px-3 py-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        maxLength={60}
        className="min-w-0 rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
      <div className="flex flex-wrap gap-3">
        {agentLabels.map((agent) => (
          <label key={agent} className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={agents.includes(agent)}
              onCheckedChange={(checked) => toggle(agent, checked === true)}
            />
            {agent}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={name.trim().length === 0}
          onClick={() => onSave({ id: initial?.id, name: name.trim(), agents })}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
