import { useState } from "react"
import { cn } from "@/lib/utils"

type Outcome = "matched" | "no_match" | "duplicate" | "error"

interface InboundEntry {
  id: string
  channel: "email" | "whatsapp"
  summary: string
  outcome: Outcome
  sender: string
  matched: number
  candidates: number
  when: string
}

const entries: InboundEntry[] = [
  {
    id: "e1",
    channel: "whatsapp",
    summary: "New lead auto-reply",
    outcome: "matched",
    sender: "+62 812-3456-7890",
    matched: 1,
    candidates: 3,
    when: "16 Sep 2026, 09:42",
  },
  {
    id: "e2",
    channel: "email",
    summary: "(no subject)",
    outcome: "no_match",
    sender: "ops@vendor.example.com",
    matched: 0,
    candidates: 2,
    when: "16 Sep 2026, 08:15",
  },
  {
    id: "e3",
    channel: "whatsapp",
    summary: "Escalate unresolved tickets",
    outcome: "error",
    sender: "+62 856-1122-3344",
    matched: 0,
    candidates: 1,
    when: "15 Sep 2026, 21:03",
  },
]

const outcomeStyle: Record<Outcome, string> = {
  matched: "text-emerald-600",
  no_match: "text-amber-600",
  duplicate: "text-muted-foreground",
  error: "text-destructive",
}

const outcomeLabel: Record<Outcome, string> = {
  matched: "matched",
  no_match: "no match",
  duplicate: "duplicate",
  error: "error",
}

const outcomeFilters: Array<{ label: string; value: Outcome | "all" }> = [
  { label: "All", value: "all" },
  { label: "Matched", value: "matched" },
  { label: "No match", value: "no_match" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Error", value: "error" },
]

const channelFilters: Array<{ label: string; value: string }> = [
  { label: "All channels", value: "all" },
  { label: "Email", value: "email" },
  { label: "WhatsApp", value: "whatsapp" },
]

export function InboundLogPage() {
  const [outcome, setOutcome] = useState<Outcome | "all">("all")
  const [channel, setChannel] = useState("all")

  const visible = entries.filter(
    (e) =>
      (outcome === "all" || e.outcome === outcome) &&
      (channel === "all" || e.channel === channel),
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Inbound log</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every inbound message that reached a workflow trigger and what was
          decided — including the ones that didn't match. Kept for a few days.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {channelFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setChannel(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              channel === f.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        {outcomeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setOutcome(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              outcome === f.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {visible.map((e) => (
          <li key={e.id} className="rounded-xl border bg-card shadow-sm">
            <div className="flex w-full items-center gap-3 p-3.5 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {e.channel}
                  </span>
                  <span className="truncate font-medium">{e.summary}</span>
                  <span className={cn("shrink-0 text-xs font-medium", outcomeStyle[e.outcome])}>
                    {outcomeLabel[e.outcome]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {e.sender} · {e.matched}/{e.candidates} flow
                  {e.candidates === 1 ? "" : "s"} matched · {e.when}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
