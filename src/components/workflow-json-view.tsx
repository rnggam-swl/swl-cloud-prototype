import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { WorkflowStep, WorkflowTrigger } from "@/lib/workflow-data"

export function WorkflowJsonView({
  trigger,
  steps,
  onApply,
}: {
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  onApply: (trigger: WorkflowTrigger, steps: WorkflowStep[]) => void
}) {
  const [text, setText] = useState(() => JSON.stringify({ trigger, steps }, null, 2))
  const [error, setError] = useState<string | null>(null)

  function handleApply() {
    try {
      const parsed = JSON.parse(text) as { trigger?: WorkflowTrigger; steps?: WorkflowStep[] }
      if (!parsed.trigger || !Array.isArray(parsed.steps)) {
        throw new Error('Expected an object with "trigger" and "steps".')
      }
      onApply(parsed.trigger, parsed.steps)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  function handleReset() {
    setText(JSON.stringify({ trigger, steps }, null, 2))
    setError(null)
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={20}
        spellCheck={false}
        className="font-mono text-xs"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Edit the trigger and steps directly, then apply to update the builder.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" size="sm" onClick={handleApply}>
            Apply changes
          </Button>
        </div>
      </div>
    </div>
  )
}
