import { useState } from "react"
import { Cpu, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US")
}

interface UsageByModel {
  mode: "crew" | "connect" | "flow"
  model: string
  inputTokens: number
  outputTokens: number
  neurons: number
  calls: number
}

const MOCK_USAGE = {
  period: "2026-09",
  byModel: [
    { mode: "crew", model: "sawala-pro", inputTokens: 1204002, outputTokens: 312884, neurons: 9441, calls: 612 },
    { mode: "connect", model: "sawala-mini", inputTokens: 845120, outputTokens: 198006, neurons: 5102, calls: 1204 },
  ] as UsageByModel[],
  totals: { inputTokens: 2049122, outputTokens: 510890, neurons: 14543, calls: 1816 },
  measuredAt: "16 Sep 2026, 09:00",
}

export function ModelUsage() {
  const [refreshing, setRefreshing] = useState(false)

  function refresh() {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 500)
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">AI compute usage</h2>
          <span className="text-xs text-muted-foreground">({MOCK_USAGE.period})</span>
        </div>
        <Button size="sm" variant="ghost" aria-label="Refresh AI compute usage" onClick={refresh}>
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="AI compute (neurons)" value={formatCount(MOCK_USAGE.totals.neurons)} />
          <Stat label="Input tokens" value={formatCount(MOCK_USAGE.totals.inputTokens)} />
          <Stat label="Output tokens" value={formatCount(MOCK_USAGE.totals.outputTokens)} />
          <Stat label="Calls" value={formatCount(MOCK_USAGE.totals.calls)} />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">By surface &amp; model</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Surface</th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">Input</th>
                  <th className="px-3 py-2 text-right font-medium">Output</th>
                  <th className="px-3 py-2 text-right font-medium">Neurons</th>
                  <th className="px-3 py-2 text-right font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_USAGE.byModel.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-center text-xs text-muted-foreground">
                      No AI compute recorded this month yet.
                    </td>
                  </tr>
                ) : (
                  MOCK_USAGE.byModel.map((r) => (
                    <tr key={`${r.mode}:${r.model}`} className="border-t">
                      <td className="px-3 py-2 capitalize">{r.mode}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.model}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.inputTokens)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.outputTokens)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.neurons)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.calls)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Neurons are Cloudflare's unit of AI compute. Monetary conversion is not yet applied — this is a usage
          measure, not a bill. Last measured {MOCK_USAGE.measuredAt}
          {refreshing ? " · refreshing…" : ""}
        </p>
      </div>
    </section>
  )
}
