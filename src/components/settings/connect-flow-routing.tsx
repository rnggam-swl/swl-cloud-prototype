import { useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { usePersistedWorkflows, type FlowMatchType, type WorkflowSummary } from "@/lib/workflow-data"
import { cn } from "@/lib/utils"

const field =
  "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"

const VALUE_PLACEHOLDER: Record<FlowMatchType, string> = {
  always: "",
  keyword: "invoice",
  menu_option: "option id",
  agent: "sales",
}

// Decides which incoming WhatsApp messages run an automation. Only messages
// that match a rule below forward to a workflow — everything else is
// answered by the Connect agent as usual. Build a workflow's steps in
// Flow → Workflows; this page only edits its trigger.
export function ConnectFlowRouting() {
  const [workflows, setWorkflows] = usePersistedWorkflows()
  const [pendingDisable, setPendingDisable] = useState<WorkflowSummary | null>(null)

  const rules = workflows.filter((w) => w.trigger.kind === "whatsapp")

  function patch(id: string, patch: Partial<WorkflowSummary["trigger"]>) {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, trigger: { ...w.trigger, ...patch } } : w)))
  }

  function setEnabled(w: WorkflowSummary, enabled: boolean) {
    if (!enabled) {
      setPendingDisable(w)
      return
    }
    setWorkflows((prev) => prev.map((x) => (x.id === w.id ? { ...x, enabled: true } : x)))
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">Flow routing</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Decide which incoming WhatsApp messages run an automation. Only messages that match a rule below forward to a
        workflow — everything else is answered by the Connect agent as usual. Build a workflow's steps in Flow →
        Workflows.
      </p>

      {rules.length === 0 ? (
        <p className="mt-3 rounded-lg border bg-background px-3 py-3 text-xs text-muted-foreground">
          No WhatsApp-triggered workflows yet. Create one in Flow → Workflows with a "WhatsApp inbound" trigger, and
          it will appear here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rules.map((w) => {
            const matchType = w.trigger.matchType ?? "always"
            return (
              <li key={w.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">{w.name}</span>
                  <label className="flex shrink-0 items-center gap-2 text-xs">
                    <Switch checked={w.enabled} onCheckedChange={(v) => setEnabled(w, v)} />
                    <span className={cn(w.enabled && "font-medium")}>{w.enabled ? "Enabled" : "Disabled"}</span>
                  </label>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Match
                    <select
                      className={cn(field, "mt-1")}
                      value={matchType}
                      onChange={(e) => patch(w.id, { matchType: e.target.value as FlowMatchType })}
                    >
                      <option value="always">Every message</option>
                      <option value="keyword">Contains keyword</option>
                      <option value="menu_option">Menu option tapped</option>
                      <option value="agent">Routed to agent</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Value
                    <input
                      className={cn(field, "mt-1", matchType === "always" && "opacity-40")}
                      disabled={matchType === "always"}
                      value={w.trigger.matchValue ?? ""}
                      onChange={(e) => patch(w.id, { matchValue: e.target.value })}
                      placeholder={VALUE_PLACEHOLDER[matchType]}
                    />
                  </label>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    When it fires
                    <select
                      className={cn(field, "mt-1")}
                      value={w.trigger.replyMode ?? "additive"}
                      onChange={(e) => patch(w.id, { replyMode: e.target.value as "additive" | "handoff" })}
                    >
                      <option value="additive">Additive (agent still replies)</option>
                      <option value="handoff">Handoff (flow owns the reply)</option>
                    </select>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog open={pendingDisable !== null} onOpenChange={(open) => !open && setPendingDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDisable?.name}</span> will stop running. Messages
              that previously matched this rule will go back to being answered by the Connect agent as usual. You can
              enable it again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDisable) {
                  const id = pendingDisable.id
                  setWorkflows((prev) => prev.map((x) => (x.id === id ? { ...x, enabled: false } : x)))
                }
                setPendingDisable(null)
              }}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
