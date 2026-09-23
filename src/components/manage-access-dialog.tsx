import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { KnowledgeDocument } from "@/lib/knowledge-data"
import { isGroupVariant, useKnowledgeVariant } from "@/lib/knowledge-variant"
import { usePersistedSettings } from "@/lib/settings-data"

export interface AccessSaveFields {
  scope: string
  extraScopes?: string[]
  groupId?: string
}

// The "who can see this document" editor for an already-existing document —
// used both by Variant B's row-level "Manage Access" action (assignment is
// decoupled from upload there) and by the Knowledge base detail page, which
// offers it regardless of variant since editing an existing document's
// access has no other entry point once it's already been created.
export function ManageAccessDialog({
  doc,
  open,
  onOpenChange,
  onSave,
}: {
  doc: KnowledgeDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, fields: AccessSaveFields) => void
}) {
  const { variant, groups } = useKnowledgeVariant()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="min-w-0">
          <DialogTitle>Manage access</DialogTitle>
          <DialogDescription className="truncate">
            {doc?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by the document id so the form always initializes from
            that document's current access, instead of syncing a prop change
            into state via an effect. */}
        {doc &&
          (isGroupVariant(variant) ? (
            <GroupAccessForm
              key={doc.id}
              doc={doc}
              groups={groups}
              onCancel={() => onOpenChange(false)}
              onSave={(fields) => {
                onSave(doc.id, fields)
                onOpenChange(false)
              }}
            />
          ) : (
            <AgentAccessForm
              key={doc.id}
              doc={doc}
              onCancel={() => onOpenChange(false)}
              onSave={(fields) => {
                onSave(doc.id, fields)
                onOpenChange(false)
              }}
            />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function AgentAccessForm({
  doc,
  onCancel,
  onSave,
}: {
  doc: KnowledgeDocument
  onCancel: () => void
  onSave: (fields: AccessSaveFields) => void
}) {
  const [settings] = usePersistedSettings()
  const agentLabels = settings.connectAgents.filter((a) => a.enabled).map((a) => a.label)
  const [agents, setAgents] = useState<string[]>(() =>
    doc.scope === "General" ? [] : [doc.scope, ...(doc.extraScopes ?? [])],
  )

  function toggle(agent: string, checked: boolean) {
    setAgents((prev) =>
      checked ? [...prev, agent] : prev.filter((a) => a !== agent),
    )
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <Checkbox
            checked={agents.length === 0}
            onCheckedChange={(checked) => {
              if (checked === true) setAgents([])
            }}
          />
          General (All Agents)
        </label>
        <Separator className="my-1" />
        {agentLabels.map((agent) => (
          <label
            key={agent}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={agents.includes(agent)}
              onCheckedChange={(checked) => toggle(agent, checked === true)}
            />
            {agent}
          </label>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSave({
              scope: agents.length === 0 ? "General" : agents[0],
              extraScopes: agents.length > 1 ? agents.slice(1) : undefined,
              groupId: undefined,
            })
          }
        >
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

function GroupAccessForm({
  doc,
  groups,
  onCancel,
  onSave,
}: {
  doc: KnowledgeDocument
  groups: { id: string; name: string; agents: string[] }[]
  onCancel: () => void
  onSave: (fields: AccessSaveFields) => void
}) {
  const [groupId, setGroupId] = useState<string | undefined>(doc.groupId)

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <Checkbox
            checked={!groupId}
            onCheckedChange={(checked) => {
              if (checked === true) setGroupId(undefined)
            }}
          />
          General (All Agents)
        </label>
        <Separator className="my-1" />
        {groups.map((g) => (
          <label
            key={g.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={groupId === g.id}
              onCheckedChange={(checked) => {
                if (checked === true) setGroupId(g.id)
              }}
            />
            <span className="flex-1">{g.name}</span>
            <span className="text-[10px] text-muted-foreground">{g.agents.join(", ")}</span>
          </label>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            const group = groups.find((g) => g.id === groupId)
            onSave({ scope: group?.name ?? "General", extraScopes: undefined, groupId })
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  )
}
