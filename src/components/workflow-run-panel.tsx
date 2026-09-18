import { useRef, useState } from "react"
import { ChevronDown, ChevronRight, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  STEP_META,
  type RunKind,
  type RunStatus,
  type StepRunStatus,
  type StepTrace,
  type WorkflowRun,
  type WorkflowSummary,
} from "@/lib/workflow-data"

const RUN_STATUS_DOT: Record<RunStatus, string> = {
  queued: "bg-muted-foreground/40",
  running: "bg-blue-500 animate-pulse",
  succeeded: "bg-emerald-500",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/40",
}

const RUN_KIND_BADGE: Record<RunKind, string> = {
  simulated: "border text-muted-foreground",
  test: "border-amber-500/40 text-amber-600",
  triggered: "border-blue-500/40 text-blue-600",
}

const RUN_KIND_LABEL: Record<RunKind, string> = {
  simulated: "Simulated",
  test: "Test run",
  triggered: "Triggered",
}

const STEP_STATUS_STYLE: Record<StepRunStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-blue-600",
  succeeded: "text-emerald-600",
  failed: "text-destructive",
  skipped: "text-muted-foreground",
}

function canned(stepKind: StepTrace["kind"], name: string): string {
  const meta = STEP_META[stepKind]
  return `${name || meta.label} completed successfully (simulated).`
}

function TraceList({ trace }: { trace: StepTrace[] }) {
  return (
    <ul className="space-y-1.5">
      {trace.map((t) => {
        const meta = STEP_META[t.kind]
        const Icon = meta.icon
        return (
          <li key={t.stepId} className="flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs">
            <Icon className="mt-0.5 size-3.5 shrink-0" style={{ color: meta.accent }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {t.stepId}
                </span>
                <span className="truncate font-medium">{t.name}</span>
                <span className={cn("ml-auto shrink-0 text-[10px] font-medium", STEP_STATUS_STYLE[t.status])}>
                  {t.status}
                </span>
              </div>
              {t.output && <p className="mt-1 text-muted-foreground">{t.output}</p>}
              {t.error && <p className="mt-1 text-destructive">{t.error}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function RunEntryCard({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = !!run.trace && run.trace.length > 0

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left",
          canExpand && "cursor-pointer hover:bg-accent/40",
        )}
      >
        <span className={cn("size-2 shrink-0 rounded-full", RUN_STATUS_DOT[run.status])} />
        <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 text-[10px]", RUN_KIND_BADGE[run.kind])}>
          {RUN_KIND_LABEL[run.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs">{run.label}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{run.startedAt}</span>
        {canExpand &&
          (expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          ))}
      </button>
      {expanded && run.trace && (
        <div className="border-t px-3 py-2">
          <TraceList trace={run.trace} />
        </div>
      )}
    </div>
  )
}

export function WorkflowRunPanel({
  workflow,
  initialTab = "run",
  onClose,
  onRunComplete,
}: {
  workflow: WorkflowSummary
  initialTab?: "run" | "history"
  onClose: () => void
  onRunComplete: (run: WorkflowRun) => void
}) {
  const [tab, setTab] = useState<"run" | "history">(initialTab)
  const [simulating, setSimulating] = useState(false)
  const [liveTrace, setLiveTrace] = useState<StepTrace[] | null>(null)
  const timersRef = useRef<number[]>([])

  function runSimulation() {
    const activeSteps = workflow.steps.filter((s) => s.enabled)
    if (activeSteps.length === 0) return
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []

    const trace: StepTrace[] = activeSteps.map((s) => ({
      stepId: s.id,
      name: s.name,
      kind: s.kind,
      status: "pending",
    }))
    setLiveTrace([...trace])
    setSimulating(true)

    activeSteps.forEach((step, i) => {
      const startAt = window.setTimeout(() => {
        setLiveTrace((prev) =>
          prev?.map((t) => (t.stepId === step.id ? { ...t, status: "running" } : t)) ?? prev,
        )
      }, i * 700)
      const doneAt = window.setTimeout(() => {
        const output = canned(step.kind, step.name)
        setLiveTrace((prev) =>
          prev?.map((t) => (t.stepId === step.id ? { ...t, status: "succeeded" as const, output } : t)) ?? prev,
        )
        // By the last step's timer, every earlier step has already fired its own
        // "succeeded" update (timers run strictly in order), so the final trace
        // can be derived from the closed-over `trace` array directly — reading
        // it back out of `setLiveTrace`'s updater would call `setSimulating` and
        // `onRunComplete` (which updates the parent) from inside another
        // component's state updater, which React rightly warns about.
        if (i === activeSteps.length - 1) {
          setSimulating(false)
          onRunComplete({
            id: crypto.randomUUID(),
            kind: "simulated",
            status: "succeeded",
            startedAt: "just now",
            label: "Simulated run",
            trace: trace.map((t) => ({ ...t, status: "succeeded", output: canned(t.kind, t.name) })),
          })
        }
      }, i * 700 + 500)
      timersRef.current.push(startAt, doneAt)
    })
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l bg-card shadow-xl sm:w-[420px]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">Test &amp; history</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-b px-3 pt-2">
        {(["run", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-xs font-medium capitalize",
              tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "run" ? (
          <div className="space-y-3">
            <Button type="button" size="sm" onClick={runSimulation} disabled={simulating}>
              <Play className="size-3.5" />
              {simulating ? "Running…" : "Run test"}
            </Button>
            {liveTrace && <TraceList trace={liveTrace} />}
            {!liveTrace && (
              <p className="text-xs text-muted-foreground">
                Run a simulated pass to see each step's status and output here.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(workflow.runs ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet.</p>
            ) : (
              (workflow.runs ?? []).map((run) => <RunEntryCard key={run.id} run={run} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
