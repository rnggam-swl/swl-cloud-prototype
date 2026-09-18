import { useCallback, useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeEditor } from "@/components/settings/agent-instruction-editor"
import { usePersistedDocuments } from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { metaLine } from "@/lib/model-catalog"
import {
  catalogFor,
  usePersistedSettings,
  type ConnectAgent,
  type ConnectSuboption,
  type KbMode,
} from "@/lib/settings-data"
import { cn } from "@/lib/utils"

const AGENT_KEY_RE = /^[a-z0-9-]{1,32}$/
const SUB_KEY_RE = /^[a-z0-9-]{1,32}$/

export type AgentDetailTab = "details" | "instructions"

const field =
  "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"

// Everything about ONE agent, in one dialog: metadata form + instructions
// editor as tabs, so there is exactly one place that says "which agent am I
// editing" — the `agentKey` prop, supplied by the page from the URL.
export function AgentDetailDialog({
  agentKey,
  mode,
  tab,
  onTabChange,
  open,
  onOpenChange,
  onCreated,
  isOrgAdmin,
}: {
  /** '' while creating a new agent. */
  agentKey: string
  mode: KbMode
  tab: AgentDetailTab
  onTabChange: (tab: AgentDetailTab) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (agentKey: string) => void
  isOrgAdmin: boolean
}) {
  const [settings] = usePersistedSettings()
  const creating = agentKey === ""
  const existing = creating ? null : (settings.connectAgents.find((a) => a.agentKey === agentKey) ?? null)

  const dirtyRef = useRef({ form: false, instruction: false })
  const setFormDirty = useCallback((d: boolean) => {
    dirtyRef.current.form = d
  }, [])
  const setInstructionDirty = useCallback((d: boolean) => {
    dirtyRef.current.instruction = d
  }, [])

  const requestClose = useCallback(
    (next: boolean) => {
      const dirty = dirtyRef.current.form || dirtyRef.current.instruction
      if (!next && dirty && !window.confirm("Discard unsaved changes?")) return
      onOpenChange(next)
    },
    [onOpenChange],
  )

  const activeTab: AgentDetailTab = creating ? "details" : tab
  const title = creating ? "New agent" : existing?.label || agentKey

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="flex h-[80vh] max-w-3xl flex-col gap-4 sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{creating ? "New agent" : `Configuring: ${title}`}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as AgentDetailTab)} className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            {!creating && <TabsTrigger value="instructions">Instructions</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="overflow-y-auto">
            <AgentForm
              existing={existing}
              isOrgAdmin={isOrgAdmin}
              onCancel={() => requestClose(false)}
              onDirtyChange={setFormDirty}
              onCreated={onCreated}
            />
          </TabsContent>

          {!creating && (
            <TabsContent value="instructions" className="overflow-y-auto">
              <ModeEditor mode={mode} isOrgAdmin={isOrgAdmin} agent={agentKey} onDirtyChange={setInstructionDirty} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function AgentForm({
  existing,
  isOrgAdmin,
  onCancel,
  onDirtyChange,
  onCreated,
}: {
  existing: ConnectAgent | null
  isOrgAdmin: boolean
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  onCreated: (agentKey: string) => void
}) {
  const [, setSettings] = usePersistedSettings()
  const { variant, groups, setGroups } = useKnowledgeVariant()
  const [documents, setDocuments] = usePersistedDocuments()
  const isEdit = existing !== null
  const [agentKey, setAgentKey] = useState(existing?.agentKey ?? "")
  const [label, setLabel] = useState(existing?.label ?? "")
  const [labelId, setLabelId] = useState(existing?.labelId ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [enabled, setEnabled] = useState(existing?.enabled ?? true)
  const [welcomeMessage, setWelcomeMessage] = useState(existing?.welcomeMessage ?? "")
  const [model, setModel] = useState(existing?.model ?? "")
  const [feedback, setFeedback] = useState<string | null>(null)

  const modelChoices = catalogFor("connect")

  // Variant C (Knowledge Groups): which group this agent currently belongs
  // to, derived from the group side (a group owns its agent list) so this
  // form and Manage Groups can never disagree about membership.
  const currentGroup = existing ? groups.find((g) => g.agents.includes(existing.label)) : undefined
  const [groupId, setGroupId] = useState(currentGroup?.id ?? "")

  // Variant A/B: which documents are already scoped to this agent, by its
  // saved label — a live preview, not something this form edits directly.
  // Scoping stays on the Knowledge base page; this is just visibility into
  // the effect of that other page's choices, from the agent's side.
  const scopedDocs = existing
    ? documents.filter((d) => d.scope === existing.label || d.extraScopes?.includes(existing.label))
    : []

  const dirty =
    agentKey !== (existing?.agentKey ?? "") ||
    label !== (existing?.label ?? "") ||
    labelId !== (existing?.labelId ?? "") ||
    description !== (existing?.description ?? "") ||
    enabled !== (existing?.enabled ?? true) ||
    welcomeMessage !== (existing?.welcomeMessage ?? "") ||
    model !== (existing?.model ?? "") ||
    groupId !== (currentGroup?.id ?? "")
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const keyValid = AGENT_KEY_RE.test(agentKey.trim())
  const canSave = keyValid && label.trim().length > 0 && description.trim().length > 0

  function save() {
    const key = agentKey.trim()
    const newLabel = label.trim()
    const oldLabel = existing?.label
    const renamed = isEdit && oldLabel !== undefined && oldLabel !== newLabel
    const next: ConnectAgent = {
      agentKey: key,
      label: newLabel,
      labelId: labelId.trim() || undefined,
      description: description.trim(),
      enabled,
      welcomeMessage: welcomeMessage.trim() || undefined,
      model,
    }
    setSettings((prev) => ({
      ...prev,
      connectAgents: isEdit
        ? prev.connectAgents.map((a) => (a.agentKey === key ? next : a))
        : [...prev.connectAgents, next],
    }))

    // Knowledge groups (variant C) reference agents by label, so a rename
    // has to follow through there too, on top of applying this form's own
    // group choice — both are one pass over `groups` so they can't race.
    if (renamed || variant === "c") {
      setGroups((prev) =>
        prev.map((g) => {
          let agentsList = g.agents
          if (renamed && oldLabel && agentsList.includes(oldLabel)) {
            agentsList = agentsList.map((a) => (a === oldLabel ? newLabel : a))
          }
          if (variant === "c") {
            const has = agentsList.includes(newLabel)
            if (g.id === groupId && !has) agentsList = [...agentsList, newLabel]
            if (g.id !== groupId && has) agentsList = agentsList.filter((a) => a !== newLabel)
          }
          return agentsList === g.agents ? g : { ...g, agents: agentsList }
        }),
      )
    }

    // Documents (variant A/B) hold the agent's label directly in `scope` /
    // `extraScopes` — a rename has to follow through there too, or the
    // document list would silently point at a persona that no longer exists.
    if (renamed && oldLabel) {
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.scope !== oldLabel && !d.extraScopes?.includes(oldLabel)) return d
          return {
            ...d,
            scope: d.scope === oldLabel ? newLabel : d.scope,
            extraScopes: d.extraScopes?.map((s) => (s === oldLabel ? newLabel : s)),
          }
        }),
      )
    }

    setFeedback("Agent saved.")
    if (!isEdit) onCreated(key)
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Key</label>
          <input
            className={cn(field, "mt-1 font-mono")}
            value={agentKey}
            onChange={(e) => setAgentKey(e.target.value)}
            placeholder="billing"
            disabled={isEdit}
          />
          {!keyValid && agentKey.length > 0 && (
            <p className="mt-0.5 text-[10px] text-destructive">lowercase letters, digits, hyphens (1–32)</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium">Label</label>
          <input className={cn(field, "mt-1")} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Billing" maxLength={80} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium">
          Indonesian label <span className="font-normal text-muted-foreground">(optional — shown when customer writes in Indonesian)</span>
        </label>
        <input className={cn(field, "mt-1")} value={labelId} onChange={(e) => setLabelId(e.target.value)} placeholder="Tagihan" maxLength={80} />
      </div>
      <div>
        <label className="text-xs font-medium">Description (used to route messages)</label>
        <input
          className={cn(field, "mt-1")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="invoices, payments, amounts due, refunds"
          maxLength={280}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
        Enabled
      </label>

      {variant === "c" ? (
        <div>
          <label className="text-xs font-medium">Knowledge group</label>
          <select className={cn(field, "mt-1")} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Which knowledge group this agent draws from. Manage groups from the Knowledge base page.
          </p>
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium">Documents available to this agent</label>
          {!existing ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Save this agent, then scope documents to it from the Knowledge base page.
            </p>
          ) : scopedDocs.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">No documents scoped to this agent yet.</p>
          ) : (
            <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto rounded-md border p-2">
              {scopedDocs.map((d) => (
                <li key={d.id} className="truncate text-xs">
                  {d.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-0.5 text-[10px] text-muted-foreground">Manage document access from the Knowledge base page.</p>
        </div>
      )}
      <div>
        <label className="text-xs font-medium">
          Chat model <span className="font-normal text-muted-foreground">(optional — this agent&apos;s own model)</span>
        </label>
        {/* A plain <select>, not the Radix one — a portalled listbox inside a
            Dialog has its wheel events swallowed by the dialog's scroll lock. */}
        <select className={cn(field, "mt-1")} value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">Inherit organization default</option>
          {modelChoices.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} · {metaLine(modelChoices, m.id)}
            </option>
          ))}
          {model && !modelChoices.some((m) => m.id === model) && <option value={model}>{model} (no longer available)</option>}
        </select>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Which model answers when a customer is routed to this agent. Leave on inherit to follow the organization/project setting in Settings → Model.
        </p>
      </div>
      {!isOrgAdmin && (
        <p className="text-[11px] text-muted-foreground">
          Note: org-level roster changes need an org admin; a project-scoped roster saves for this project.
        </p>
      )}
      <div>
        <label className="text-xs font-medium">
          Welcome message <span className="font-normal text-muted-foreground">(optional — leave blank to auto-generate)</span>
        </label>
        <textarea
          className={cn(field, "mt-1 resize-none")}
          rows={2}
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="Selamat datang di Billing! Ada yang bisa saya bantu?"
          maxLength={1024}
        />
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          If blank, the AI generates a language-matched greeting using this agent&apos;s instruction.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!canSave}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}

      {isEdit && existing.agentKey !== "general" && <SuboptionsEditor agentKey={existing.agentKey} isOrgAdmin={isOrgAdmin} />}
    </div>
  )
}

function SuboptionsEditor({ agentKey, isOrgAdmin }: { agentKey: string; isOrgAdmin: boolean }) {
  const [settings, setSettings] = usePersistedSettings()
  const subs = settings.suboptions[agentKey] ?? []

  const [editing, setEditing] = useState<ConnectSuboption | "new" | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ subKey: string; label: string } | null>(null)

  function remove(subKey: string) {
    setSettings((prev) => ({
      ...prev,
      suboptions: { ...prev.suboptions, [agentKey]: (prev.suboptions[agentKey] ?? []).filter((s) => s.subKey !== subKey) },
    }))
  }

  function save(data: ConnectSuboption) {
    setSettings((prev) => {
      const list = prev.suboptions[agentKey] ?? []
      const exists = list.some((s) => s.subKey === data.subKey)
      const next = exists ? list.map((s) => (s.subKey === data.subKey ? data : s)) : [...list, data]
      return { ...prev, suboptions: { ...prev.suboptions, [agentKey]: next } }
    })
  }

  return (
    <div className="mt-3 rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold">Sub-menu options</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            After a customer taps this agent, they see these as a WhatsApp list before the AI replies. Leave empty to reply immediately (current behaviour).
          </p>
        </div>
        {editing === null && (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add option
          </Button>
        )}
      </div>

      {subs.length === 0 && editing === null ? (
        <p className="mt-2 text-[11px] text-muted-foreground">No sub-options yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {subs.map((s) => (
            <li key={s.subKey} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{s.label}</span>
                {s.description && <span className="ml-2 text-muted-foreground">{s.description}</span>}
                {s.instructionOverride && (
                  <span className="ml-2 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">custom prompt</span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingDelete({ subKey: s.subKey, label: s.label })}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <SuboptionForm
          existing={editing === "new" ? null : editing}
          isOrgAdmin={isOrgAdmin}
          onCancel={() => setEditing(null)}
          onSaved={(data) => {
            save(data)
            setEditing(null)
            setFeedback("Sub-option saved.")
          }}
        />
      )}

      {feedback && <p className="mt-2 text-[11px] text-muted-foreground">{feedback}</p>}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this option?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.label}</span> will be removed from this agent&apos;s sub-menu, and
              customers will no longer see it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) remove(pendingDelete.subKey)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SuboptionForm({
  existing,
  isOrgAdmin,
  onCancel,
  onSaved,
}: {
  existing: ConnectSuboption | null
  isOrgAdmin: boolean
  onCancel: () => void
  onSaved: (data: ConnectSuboption) => void
}) {
  const isEdit = existing !== null
  const [subKey, setSubKey] = useState(existing?.subKey ?? "")
  const [label, setLabel] = useState(existing?.label ?? "")
  const [labelId, setLabelId] = useState(existing?.labelId ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [descriptionId, setDescriptionId] = useState(existing?.descriptionId ?? "")
  const [sort, setSort] = useState(String(existing?.sort ?? 0))
  const [instructionOverride, setInstructionOverride] = useState(existing?.instructionOverride ?? "")

  const keyValid = SUB_KEY_RE.test(subKey.trim())
  const canSave = keyValid && label.trim().length > 0

  const smallField =
    "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"

  return (
    <div className="mt-2 space-y-2 rounded-md border border-dashed bg-muted/30 p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-medium">Key</label>
          <input className={cn(smallField, "mt-1 font-mono")} value={subKey} onChange={(e) => setSubKey(e.target.value)} placeholder="refund" disabled={isEdit} />
          {!keyValid && subKey.length > 0 && <p className="mt-0.5 text-[10px] text-destructive">lowercase letters, digits, hyphens (1–32)</p>}
        </div>
        <div>
          <label className="text-[11px] font-medium">
            Label <span className="font-normal text-muted-foreground">(≤24)</span>
          </label>
          <input className={cn(smallField, "mt-1")} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Refund" maxLength={24} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-medium">
            Indonesian label <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input className={cn(smallField, "mt-1")} value={labelId} onChange={(e) => setLabelId(e.target.value)} placeholder="Pengembalian dana" maxLength={24} />
        </div>
        <div>
          <label className="text-[11px] font-medium">Sort</label>
          <input className={cn(smallField, "mt-1")} type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium">
          Description <span className="font-normal text-muted-foreground">(optional, ≤72)</span>
        </label>
        <input className={cn(smallField, "mt-1")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Request a refund for a payment" maxLength={72} />
      </div>
      <div>
        <label className="text-[11px] font-medium">
          Indonesian description <span className="font-normal text-muted-foreground">(optional, ≤72)</span>
        </label>
        <input className={cn(smallField, "mt-1")} value={descriptionId} onChange={(e) => setDescriptionId(e.target.value)} placeholder="Ajukan pengembalian dana" maxLength={72} />
      </div>
      <div>
        <label className="text-[11px] font-medium">
          Instruction override <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          className={cn(smallField, "mt-1 resize-none")}
          rows={2}
          value={instructionOverride}
          onChange={(e) => setInstructionOverride(e.target.value)}
          placeholder="Handle refund requests only. Ask for the invoice number first."
        />
        <p className="mt-0.5 text-[10px] text-muted-foreground">If set, replaces this agent&apos;s instruction for conversations that chose this option.</p>
      </div>
      {!isOrgAdmin && <p className="text-[10px] text-muted-foreground">Note: saving sub-options needs an org admin.</p>}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() =>
            onSaved({
              subKey: subKey.trim(),
              label: label.trim(),
              labelId: labelId.trim() || undefined,
              description: description.trim() || undefined,
              descriptionId: descriptionId.trim() || undefined,
              sort: Number.isFinite(Number(sort)) ? Math.trunc(Number(sort)) : 0,
              instructionOverride: instructionOverride.trim() || undefined,
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
