import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Copy, MoreHorizontal, Pencil, Plus, Power, Trash2, X } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { triggerSummary, usePersistedWorkflows, type WorkflowSummary } from "@/lib/workflow-data"

const runToneClass: Record<NonNullable<WorkflowSummary["lastRun"]>["status"], string> = {
  succeeded: "border-emerald-500/40 text-emerald-600",
  failed: "border-destructive/40 text-destructive",
  running: "text-muted-foreground",
}

export function WorkflowsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [workflows, setWorkflows] = usePersistedWorkflows()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const saved = params.get("saved")
  const target = workflows.find((f) => f.id === deleteId)

  function dismissSaved() {
    const next = new URLSearchParams(params)
    next.delete("saved")
    setParams(next, { replace: true })
  }

  function duplicate(id: string) {
    const source = workflows.find((f) => f.id === id)
    if (!source) return
    const copy: WorkflowSummary = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (copy)`,
      enabled: false,
      lastRun: undefined,
      runs: [],
    }
    setWorkflows((prev) => [copy, ...prev])
  }

  function toggleEnabled(id: string) {
    setWorkflows((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)))
  }

  function confirmDelete() {
    if (!deleteId) return
    setWorkflows((prev) => prev.filter((f) => f.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workflows</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Automations that run by themselves: one trigger (input) → process steps → outputs.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/flow/workflows/new")}>
          <Plus className="size-4" />
          New workflow
        </Button>
      </div>

      {saved && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <span>{saved}</span>
          <Button variant="ghost" size="icon-xs" onClick={dismissSaved} aria-label="Dismiss">
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {workflows.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm hover:bg-accent/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link to={`/flow/workflows/${f.id}`} className="truncate font-medium hover:underline">
                  {f.name}
                </Link>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                    f.enabled ? "border-emerald-500/40 text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {f.enabled ? "enabled" : "disabled"}
                </span>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {triggerSummary(f.trigger)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {f.description || `${f.steps.length} step${f.steps.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {f.lastRun && (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${runToneClass[f.lastRun.status]}`}
                >
                  {f.lastRun.when}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => navigate(`/flow/workflows/${f.id}`)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => toggleEnabled(f.id)}>
                    <Power className="size-3.5" />
                    {f.enabled ? "Disable" : "Enable"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => duplicate(f.id)}>
                    <Copy className="size-3.5" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteId(f.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{target?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the workflow and stops it from running. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
