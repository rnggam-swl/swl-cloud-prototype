import { useState } from "react"
import { cn } from "@/lib/utils"

type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"

interface FlowRun {
  id: string
  flowName: string
  status: RunStatus
  runId: string
  trigger: string
  when: string
}

const runs: FlowRun[] = [
  {
    id: "r1",
    flowName: "New lead auto-reply",
    status: "succeeded",
    runId: "8f2a91c4",
    trigger: "WhatsApp message from +62 812-3456-7890",
    when: "16 Sep 2026, 09:42",
  },
  {
    id: "r2",
    flowName: "Escalate unresolved tickets",
    status: "failed",
    runId: "3bd710aa",
    trigger: "Manual trigger",
    when: "15 Sep 2026, 14:10",
  },
  {
    id: "r3",
    flowName: "Weekly usage digest",
    status: "running",
    runId: "c99e4471",
    trigger: "cron 0 8 * * 1",
    when: "16 Sep 2026, 08:00",
  },
]

const statusStyle: Record<RunStatus, string> = {
  queued: "text-muted-foreground",
  running: "text-blue-600",
  succeeded: "text-emerald-600",
  failed: "text-destructive",
  cancelled: "text-amber-600",
}

const filters: Array<{ label: string; value: RunStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
]

export function JobsPage() {
  const [filter, setFilter] = useState<RunStatus | "all">("all")
  const visible = filter === "all" ? runs : runs.filter((r) => r.status === filter)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Jobs</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every workflow run and what each step did.
        </p>
      </div>

      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {visible.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{r.flowName}</span>
                  <span className={cn("shrink-0 text-xs font-medium", statusStyle[r.status])}>
                    {r.status}
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    {r.runId}
                  </span>
                  <span className="truncate">
                    {r.trigger} · {r.when}
                  </span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
