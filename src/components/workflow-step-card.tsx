import { GripVertical, Power, PowerOff, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  STEP_META,
  TRIGGER_META,
  triggerSummary,
  type WorkflowStep,
  type WorkflowTrigger,
} from "@/lib/workflow-data"

export function TriggerCard({
  trigger,
  onEdit,
}: {
  trigger: WorkflowTrigger
  onEdit: () => void
}) {
  const meta = TRIGGER_META[trigger.kind]
  const Icon = meta.icon
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {trigger.kind === "manual" ? (
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{meta.label}</span>
        ) : (
          <button type="button" onClick={onEdit} className="min-w-0 flex-1 truncate text-left text-xs font-medium hover:text-primary">
            {meta.label}
          </button>
        )}
        {trigger.kind !== "manual" && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
          >
            Edit
          </button>
        )}
      </div>
      <p className="mt-1 truncate pl-5 text-[10px] text-muted-foreground">{triggerSummary(trigger)}</p>
    </div>
  )
}

export function StepCard({
  step,
  onEdit,
  onToggle,
  onRemove,
}: {
  step: WorkflowStep
  onEdit: () => void
  onToggle: () => void
  onRemove: () => void
}) {
  const meta = STEP_META[step.kind]
  const Icon = meta.icon

  return (
    <div className={cn("cursor-grab rounded-md border bg-card p-2.5 active:cursor-grabbing", !step.enabled && "border-dashed opacity-60")}>
      <div className="flex items-center gap-1.5">
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{meta.label}</TooltipContent>
        </Tooltip>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {step.id}
        </span>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 truncate text-left text-xs font-medium hover:text-primary">
          {step.name || meta.label}
        </button>
        {!step.enabled && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Disabled
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={step.enabled ? "Disable" : "Enable"}
          className="shrink-0 rounded border px-1.5 py-0.5 text-muted-foreground hover:bg-accent"
        >
          {step.enabled ? <Power className="size-3" /> : <PowerOff className="size-3" />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove step"
          className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {step.dependsOn && step.dependsOn.length > 0 && (
        <p className="mt-1 truncate pl-5 text-[10px] text-muted-foreground">
          also waits for {step.dependsOn.join(", ")}
        </p>
      )}
    </div>
  )
}
