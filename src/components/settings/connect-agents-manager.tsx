import { useState } from "react"
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
import { usePersistedDocuments } from "@/lib/knowledge-data"
import { useKnowledgeVariant } from "@/lib/knowledge-variant"
import { usePersistedSettings, type ConnectAgent } from "@/lib/settings-data"
import { cn } from "@/lib/utils"

// The roster of Connect sub-agents — a LIST, and nothing else. `general` is
// the implicit built-in: always present, never disabled or deleted.
export function ConnectAgentsManager({
  selected,
  onOpen,
  onCreate,
}: {
  /** The agent whose dialog is open, or '' when none is. */
  selected: string
  onOpen: (agentKey: string) => void
  onCreate: () => void
}) {
  const [settings, setSettings] = usePersistedSettings()
  const { variant, groups, setGroups } = useKnowledgeVariant()
  const [documents, setDocuments] = usePersistedDocuments()
  const agents = settings.connectAgents
  const [pendingDelete, setPendingDelete] = useState<{ agentKey: string; label: string } | null>(null)

  // Deleting an agent falls its knowledge group membership and any documents
  // scoped directly to it back to unscoped/General — mirrors the cascade the
  // Knowledge base page already does when a group itself is deleted.
  function remove(agentKey: string) {
    const label = agents.find((a) => a.agentKey === agentKey)?.label
    setSettings((prev) => ({ ...prev, connectAgents: prev.connectAgents.filter((a) => a.agentKey !== agentKey) }))
    if (!label) return
    setGroups((prev) =>
      prev.map((g) => (g.agents.includes(label) ? { ...g, agents: g.agents.filter((a) => a !== label) } : g)),
    )
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.scope !== label && !d.extraScopes?.includes(label)) return d
        return {
          ...d,
          scope: d.scope === label ? "General" : d.scope,
          extraScopes: d.extraScopes?.filter((s) => s !== label),
        }
      }),
    )
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Agents</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Named personas for the WhatsApp assistant. Each incoming message is routed to the best-matching agent,
            which answers in its own voice and (on a dedicated knowledge base) from its own tagged documents.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onCreate}>
          Add agent
        </Button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {agents.map((a: ConnectAgent) => {
          const isSelected = a.agentKey === selected
          const isGeneral = a.agentKey === "general"
          const group = variant === "c" ? groups.find((g) => g.agents.includes(a.label)) : undefined
          const docCount =
            variant !== "c"
              ? documents.filter((d) => d.scope === a.label || d.extraScopes?.includes(a.label)).length
              : 0
          return (
            <li
              key={a.agentKey}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-background",
              )}
            >
              <button type="button" onClick={() => onOpen(a.agentKey)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="truncate font-medium">{a.label}</span>
                {variant === "c" ? (
                  group && (
                    <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      #{group.name}
                    </span>
                  )
                ) : (
                  docCount > 0 && (
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {docCount} doc{docCount === 1 ? "" : "s"}
                    </span>
                  )
                )}
                {!a.enabled && (
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">disabled</span>
                )}
                <span className="truncate text-xs text-muted-foreground">{a.description}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => onOpen(a.agentKey)}>
                  Edit
                </Button>
                {!isGeneral && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete({ agentKey: a.agentKey, label: a.label })}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.label}</span> will be removed from the
              roster, and incoming messages will no longer be routed to it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) remove(pendingDelete.agentKey)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
