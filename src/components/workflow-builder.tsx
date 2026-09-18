import { useState } from "react"
import { ArrowLeft, History, MoreVertical, PlayCircle } from "lucide-react"
import { AddStepMenu } from "@/components/workflow-add-step-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { WorkflowFlowCanvas } from "@/components/workflow-flow-canvas"
import { WorkflowJsonView } from "@/components/workflow-json-view"
import { WorkflowParametersDialog } from "@/components/workflow-parameters-dialog"
import { WorkflowRunPanel } from "@/components/workflow-run-panel"
import { StepCard, TriggerCard } from "@/components/workflow-step-card"
import { StepEditDialog, TriggerEditDialog } from "@/components/workflow-step-dialogs"
import { TRIGGER_ID } from "@/lib/flow-to-graph"
import { cn } from "@/lib/utils"
import {
  FORM_FIELDS,
  nextStepId,
  OUTPUT_KINDS,
  PROCESS_KINDS,
  type FlowStepKind,
  type StarterTemplate,
  type WorkflowParameter,
  type WorkflowRun,
  type WorkflowStep,
  type WorkflowSummary,
  type WorkflowTrigger,
} from "@/lib/workflow-data"

type BuilderView = "board" | "linear" | "diagram"
type BuilderMode = "builder" | "json"

function defaultConfig(kind: FlowStepKind): Record<string, string | boolean> {
  const config: Record<string, string | boolean> = {}
  for (const field of FORM_FIELDS[kind]) {
    config[field.key] = field.kind === "checkbox" ? false : ""
  }
  return config
}

function SegmentedSwitcher<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border text-[11px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1",
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const VIEW_OPTIONS: { value: BuilderView; label: string }[] = [
  { value: "board", label: "Board" },
  { value: "linear", label: "Linear" },
  { value: "diagram", label: "Diagram" },
]

const MODE_OPTIONS: { value: BuilderMode; label: string }[] = [
  { value: "builder", label: "Builder" },
  { value: "json", label: "JSON" },
]

function ColumnSection({
  label,
  addMenu,
  children,
}: {
  label: string
  addMenu?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</h3>
        {addMenu}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  )
}

function RenameDialog({
  name,
  description,
  open,
  onOpenChange,
  onSave,
}: {
  name: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, description: string) => void
}) {
  const [draftName, setDraftName] = useState(name)
  const [draftDesc, setDraftDesc] = useState(description)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setDraftName(name)
          setDraftDesc(description)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Name &amp; description</DialogTitle>
          <DialogDescription>Shown on the workflows list.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} rows={2} maxLength={300} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={draftName.trim().length === 0}
            onClick={() => {
              onSave(draftName.trim(), draftDesc.trim())
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

export function WorkflowBuilder({
  initial,
  seedTemplate,
  otherWorkflows,
  onDone,
  onCancel,
}: {
  initial?: WorkflowSummary
  seedTemplate?: StarterTemplate | null
  otherWorkflows: { value: string; label: string }[]
  onDone: (workflow: WorkflowSummary, message: string) => void
  onCancel: () => void
}) {
  const seed = initial ?? (seedTemplate ? seedTemplate.build() : undefined)

  const [name, setName] = useState(initial?.name ?? seedTemplate?.name ?? "Untitled workflow")
  const [description, setDescription] = useState(initial?.description ?? seedTemplate?.description ?? "")
  const [enabled, setEnabled] = useState(initial?.enabled ?? false)
  const [trigger, setTrigger] = useState<WorkflowTrigger>(seed?.trigger ?? { kind: "manual" })
  const [steps, setSteps] = useState<WorkflowStep[]>(seed?.steps ?? [])
  const [runs, setRuns] = useState<WorkflowRun[]>(initial?.runs ?? [])
  const [parameters, setParameters] = useState<WorkflowParameter[]>(initial?.parameters ?? [])
  const [dirty, setDirty] = useState(false)
  const [view, setView] = useState<BuilderView>("linear")
  const [mode, setMode] = useState<BuilderMode>("builder")

  const [renameOpen, setRenameOpen] = useState(false)
  const [parametersOpen, setParametersOpen] = useState(false)
  const [triggerOpen, setTriggerOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<"run" | "history">("run")

  function requestCancel() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return
    onCancel()
  }

  function handleSave() {
    const finalName = name.trim() || "Untitled workflow"
    onDone(
      {
        id: initial?.id ?? crypto.randomUUID(),
        name: finalName,
        description,
        enabled,
        trigger,
        steps,
        lastRun: initial?.lastRun,
        runs,
        parameters,
      },
      initial ? `Saved "${finalName}"` : `Created "${finalName}"`,
    )
  }

  function applyJson(nextTrigger: WorkflowTrigger, nextSteps: WorkflowStep[]) {
    setTrigger(nextTrigger)
    setSteps(nextSteps)
    setDirty(true)
  }

  function addStep(kind: FlowStepKind) {
    const step: WorkflowStep = {
      id: nextStepId(steps),
      kind,
      name: "",
      enabled: true,
      config: defaultConfig(kind),
    }
    setSteps((prev) => [...prev, step])
    setDirty(true)
    setEditingStep(step)
  }

  function saveStep(updated: WorkflowStep) {
    setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setDirty(true)
  }

  function toggleStep(id: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
    setDirty(true)
  }

  function removeStep(id: string) {
    setSteps((prev) =>
      prev.filter((s) => s.id !== id).map((s) => ({ ...s, dependsOn: s.dependsOn?.filter((d) => d !== id) })),
    )
    setDirty(true)
  }

  function openPanel(tab: "run" | "history") {
    setPanelTab(tab)
    setPanelOpen(true)
  }

  function handleNodeActivate(nodeId: string) {
    if (nodeId === TRIGGER_ID) {
      setTriggerOpen(true)
      return
    }
    const step = steps.find((s) => s.id === nodeId)
    if (step) setEditingStep(step)
  }

  function insertAfter(afterNodeId: string, kind: FlowStepKind) {
    const step: WorkflowStep = {
      id: nextStepId(steps),
      kind,
      name: "",
      enabled: true,
      config: defaultConfig(kind),
      dependsOn: afterNodeId === TRIGGER_ID ? undefined : [afterNodeId],
    }
    setSteps((prev) => [...prev, step])
    setDirty(true)
    setEditingStep(step)
  }

  function connectSteps(sourceId: string, targetId: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, dependsOn: [...(s.dependsOn ?? []), sourceId] } : s)),
    )
    setDirty(true)
  }

  function disconnectSteps(sourceId: string, targetId: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === targetId ? { ...s, dependsOn: (s.dependsOn ?? []).filter((d) => d !== sourceId) } : s,
      ),
    )
    setDirty(true)
  }

  const processSteps = steps.filter((s) => PROCESS_KINDS.includes(s.kind))
  const outputSteps = steps.filter((s) => OUTPUT_KINDS.includes(s.kind))
  const lastRunFailed = runs[0]?.status === "failed"

  const inputSection = (
    <ColumnSection label="Input">
      <TriggerCard trigger={trigger} onEdit={() => setTriggerOpen(true)} />
    </ColumnSection>
  )
  const processSection = (
    <ColumnSection label="Process" addMenu={<AddStepMenu kinds={PROCESS_KINDS} onAdd={addStep} />}>
      {processSteps.length === 0 ? (
        <p className="text-xs text-muted-foreground">No process steps.</p>
      ) : (
        processSteps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            onEdit={() => setEditingStep(step)}
            onToggle={() => toggleStep(step.id)}
            onRemove={() => removeStep(step.id)}
          />
        ))
      )}
    </ColumnSection>
  )
  const outputSection = (
    <ColumnSection label="Output" addMenu={<AddStepMenu kinds={OUTPUT_KINDS} onAdd={addStep} />}>
      {outputSteps.length === 0 ? (
        <p className="text-xs text-muted-foreground">No output steps.</p>
      ) : (
        outputSteps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            onEdit={() => setEditingStep(step)}
            onToggle={() => toggleStep(step.id)}
            onRemove={() => removeStep(step.id)}
          />
        ))
      )}
    </ColumnSection>
  )

  return (
    <div className="w-full space-y-4">
      <div className="-mx-6 flex items-center justify-between gap-3 border-b px-6 pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={requestCancel} aria-label="Back">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{name}</h2>
            {description && <p className="mt-0.5 max-w-md truncate text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <label className="mr-1 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v)
                setDirty(true)
              }}
            />
            {enabled ? "Enabled" : "Disabled"}
          </label>
          {dirty && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              Save to apply
            </span>
          )}
          <Button type="button" size="sm" onClick={handleSave}>
            Save
            {dirty && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-current opacity-70" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="More">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Name &amp; description</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setParametersOpen(true)}>Parameters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedSwitcher value={view} onChange={setView} options={VIEW_OPTIONS} />
        <SegmentedSwitcher value={mode} onChange={setMode} options={MODE_OPTIONS} />
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => openPanel("run")}>
            <PlayCircle className="size-3.5" />
            Run
          </Button>
          <Button type="button" variant="ghost" size="sm" className="relative" onClick={() => openPanel("history")}>
            <History className="size-3.5" />
            History
            {lastRunFailed && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-destructive" />}
          </Button>
        </div>
      </div>

      {mode === "json" ? (
        <WorkflowJsonView trigger={trigger} steps={steps} onApply={applyJson} />
      ) : (
        <>
          {view === "board" && (
            <div className="grid gap-4 lg:grid-cols-3">
              {inputSection}
              {processSection}
              {outputSection}
            </div>
          )}

          {view === "linear" && (
            <div className="mx-auto max-w-2xl space-y-4">
              {inputSection}
              {processSection}
              {outputSection}
            </div>
          )}

          {view === "diagram" && (
            <WorkflowFlowCanvas
              flow={{ id: initial?.id ?? "draft", name, description, enabled, trigger, steps, runs }}
              onNodeActivate={handleNodeActivate}
              runStatus={
                runs[0]?.trace
                  ? Object.fromEntries(runs[0].trace.map((t) => [t.stepId, t.status]))
                  : undefined
              }
              onInsertAfter={insertAfter}
              onRemoveStep={removeStep}
              onConnectSteps={connectSteps}
              onDisconnectSteps={disconnectSteps}
            />
          )}
        </>
      )}

      <RenameDialog
        name={name}
        description={description}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onSave={(n, d) => {
          setName(n)
          setDescription(d)
          setDirty(true)
        }}
      />

      <WorkflowParametersDialog
        parameters={parameters}
        open={parametersOpen}
        onOpenChange={setParametersOpen}
        onSave={(p) => {
          setParameters(p)
          setDirty(true)
        }}
      />

      <TriggerEditDialog
        trigger={trigger}
        open={triggerOpen}
        onOpenChange={setTriggerOpen}
        onSave={(t) => {
          setTrigger(t)
          setDirty(true)
        }}
      />

      {editingStep && (
        <StepEditDialog
          key={editingStep.id}
          step={editingStep}
          allSteps={steps}
          otherWorkflows={otherWorkflows}
          open={!!editingStep}
          onOpenChange={(open) => !open && setEditingStep(null)}
          onSave={saveStep}
        />
      )}

      {panelOpen && (
        <WorkflowRunPanel
          workflow={{ id: initial?.id ?? "draft", name, description, enabled, trigger, steps, runs }}
          initialTab={panelTab}
          onClose={() => setPanelOpen(false)}
          onRunComplete={(run) => setRuns((prev) => [run, ...prev])}
        />
      )}
    </div>
  )
}
