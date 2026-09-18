import { useState } from "react"
import { Clock, Mail, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { usePersistedSettings } from "@/lib/settings-data"
import {
  FORM_FIELDS,
  STEP_META,
  type FieldDef,
  type TriggerKind,
  type WorkflowStep,
  type WorkflowTrigger,
} from "@/lib/workflow-data"

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string | boolean | undefined
  onChange: (value: string | boolean) => void
}) {
  switch (field.kind) {
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.label}
        </label>
      )
    case "select":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="font-mono text-xs"
          />
          {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
        </div>
      )
    case "number":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type="number"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      )
    case "text":
    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="font-mono text-xs"
          />
          {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
        </div>
      )
  }
}

export function StepConfigForm({
  fields,
  config,
  onChange,
}: {
  fields: FieldDef[]
  config: Record<string, string | boolean>
  onChange: (key: string, value: string | boolean) => void
}) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  )
}

export function StepEditDialog({
  step,
  allSteps,
  otherWorkflows,
  open,
  onOpenChange,
  onSave,
}: {
  step: WorkflowStep
  allSteps: WorkflowStep[]
  otherWorkflows: { value: string; label: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (step: WorkflowStep) => void
}) {
  const [name, setName] = useState(step.name)
  const [config, setConfig] = useState(step.config)
  const [dependsOn, setDependsOn] = useState<string[]>(step.dependsOn ?? [])
  const [settings] = usePersistedSettings()

  const meta = STEP_META[step.kind]
  const Icon = meta.icon
  const agentOptions = [
    { value: "none", label: "No agent — just prompt the model" },
    ...settings.connectAgents.filter((a) => a.enabled).map((a) => ({ value: a.label, label: a.label })),
  ]
  const currentAgent = config.agent
  if (
    typeof currentAgent === "string" &&
    currentAgent !== "none" &&
    !agentOptions.some((o) => o.value === currentAgent)
  ) {
    agentOptions.push({ value: currentAgent, label: `${currentAgent} (no longer available)` })
  }
  const fields = FORM_FIELDS[step.kind].map((f) => {
    if (step.kind === "call_flow" && f.key === "callee") return { ...f, options: otherWorkflows }
    if (f.key === "agent") return { ...f, options: agentOptions }
    return f
  })
  const otherStepIds = allSteps.filter((s) => s.id !== step.id)

  function toggleDepends(id: string, checked: boolean) {
    setDependsOn((prev) => (checked ? [...prev, id] : prev.filter((d) => d !== id)))
  }

  function handleSave() {
    onSave({ ...step, name: name.trim() || meta.label, config, dependsOn: dependsOn.length > 0 ? dependsOn : undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setName(step.name); setConfig(step.config); setDependsOn(step.dependsOn ?? []) } onOpenChange(next) }}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-4 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${meta.accent}1a`, color: meta.accent }}
            >
              <Icon className="size-4" />
            </span>
            <DialogTitle className="flex-1">{meta.label}</DialogTitle>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {step.id}
            </span>
          </div>
          <DialogDescription className="sr-only">Configure this step</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Step name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.label} />
        </div>

        {otherStepIds.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Also runs after</Label>
            <div className="flex flex-wrap gap-3 rounded-md border px-3 py-2">
              {otherStepIds.map((s) => (
                <label key={s.id} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={dependsOn.includes(s.id)}
                    onCheckedChange={(checked) => toggleDepends(s.id, checked === true)}
                  />
                  {s.id} · {s.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <StepConfigForm
          fields={fields}
          config={config}
          onChange={(key, value) => setConfig((prev) => ({ ...prev, [key]: value }))}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const TRIGGER_KIND_OPTIONS: { value: TriggerKind; label: string; icon: typeof Clock }[] = [
  { value: "cron", label: "Schedule (cron)", icon: Clock },
  { value: "whatsapp", label: "WhatsApp inbound", icon: MessageCircle },
  { value: "email", label: "Email inbound", icon: Mail },
]

export function TriggerEditDialog({
  trigger,
  open,
  onOpenChange,
  onSave,
}: {
  trigger: WorkflowTrigger
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (trigger: WorkflowTrigger) => void
}) {
  const [draft, setDraft] = useState<WorkflowTrigger>(trigger)

  function handleSave() {
    onSave(draft)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft(trigger)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit trigger</DialogTitle>
          <DialogDescription>What starts this workflow.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Trigger type</Label>
          <Select
            value={draft.kind}
            onValueChange={(v) => setDraft({ kind: v as TriggerKind })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {draft.kind === "cron" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cron expression</Label>
              <Input
                value={draft.cronExpr ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, cronExpr: e.target.value }))}
                placeholder="0 8 * * 1"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Timezone</Label>
              <Input
                value={draft.timezone ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, timezone: e.target.value }))}
                placeholder="Asia/Jakarta"
              />
            </div>
          </div>
        )}

        {draft.kind === "email" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From filter</Label>
              <Input
                value={draft.fromFilter ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, fromFilter: e.target.value }))}
                placeholder="Optional — e.g. @customer.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subject filter</Label>
              <Input
                value={draft.subjectFilter ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, subjectFilter: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
        )}

        {draft.kind === "whatsapp" && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Fires on every inbound WhatsApp message to this project's number.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
