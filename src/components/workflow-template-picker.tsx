import { Button } from "@/components/ui/button"
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/workflow-data"

export function TemplatePicker({
  onPick,
  onCancel,
}: {
  onPick: (template: StarterTemplate | null) => void
  onCancel: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Start a new workflow</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a template to scaffold the steps, or start from scratch.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {STARTER_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onPick(tpl)}
            className="rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
          >
            <p className="text-sm font-medium">{tpl.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tpl.description}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPick(null)}
          className="rounded-lg border border-dashed p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
        >
          <p className="text-sm font-medium">Blank workflow</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start from an empty canvas and add your own steps.
          </p>
        </button>
      </div>
    </div>
  )
}
