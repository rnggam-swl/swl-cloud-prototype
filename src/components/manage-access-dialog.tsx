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
import { usePersistedSettings } from "@/lib/settings-data"

// Variant B: access is assigned per document, decoupled from the
// upload/write flow — this is that assignment surface.
export function ManageAccessDialog({
  doc,
  open,
  onOpenChange,
  onSave,
}: {
  doc: KnowledgeDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, agents: string[]) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="min-w-0">
          <DialogTitle>Manage access</DialogTitle>
          <DialogDescription className="truncate">
            {doc?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by the document id so the checklist always initializes from
            that document's current access, instead of syncing a prop change
            into state via an effect. */}
        {doc && (
          <AccessForm
            key={doc.id}
            doc={doc}
            onCancel={() => onOpenChange(false)}
            onSave={(agents) => {
              onSave(doc.id, agents)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AccessForm({
  doc,
  onCancel,
  onSave,
}: {
  doc: KnowledgeDocument
  onCancel: () => void
  onSave: (agents: string[]) => void
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
        <Button onClick={() => onSave(agents)}>Save</Button>
      </DialogFooter>
    </>
  )
}
