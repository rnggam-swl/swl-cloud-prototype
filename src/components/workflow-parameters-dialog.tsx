import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { WorkflowParameter } from "@/lib/workflow-data"

export function WorkflowParametersDialog({
  parameters,
  open,
  onOpenChange,
  onSave,
}: {
  parameters: WorkflowParameter[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (parameters: WorkflowParameter[]) => void
}) {
  const [draft, setDraft] = useState<WorkflowParameter[]>(parameters)

  function update(i: number, patch: Partial<WorkflowParameter>) {
    setDraft((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  function remove(i: number) {
    setDraft((prev) => prev.filter((_, idx) => idx !== i))
  }

  function add() {
    setDraft((prev) => [...prev, { name: "", description: "" }])
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft(parameters)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Parameters</DialogTitle>
          <DialogDescription>
            What another workflow can pass in when it calls this one with "Call another flow".
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {draft.length === 0 && <p className="text-xs text-muted-foreground">No parameters yet.</p>}
          {draft.map((p, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border p-2.5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Input
                  value={p.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Parameter name, e.g. customerId"
                  className="font-mono text-xs"
                />
                <Input
                  value={p.description ?? ""}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Description (optional)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
                aria-label="Remove parameter"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}>
          <Plus className="size-3.5" />
          New parameter
        </Button>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onSave(draft.filter((p) => p.name.trim().length > 0))
              onOpenChange(false)
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
