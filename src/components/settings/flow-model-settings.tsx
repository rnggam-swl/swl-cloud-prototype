import { Info } from "lucide-react"
import { AllowedModelsCard } from "@/components/settings/allowed-models-card"

// FLOW deliberately carries ONLY the Allowed models card, no project/org
// default cards: an AI step either pins a model or falls back to the
// platform built-in — there is no per-project/per-org FLOW default to set.
export function FlowModelSettings() {
  const isOrgAdmin = true

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="border-b bg-background px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Model</h1>
        <p className="text-xs text-muted-foreground">
          Which Sawala-approved models your automations may use. Takes effect on the next run — no deploy.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 opacity-75" />
            <span>
              Each AI step in a workflow chooses its own model. A step that doesn&apos;t choose one uses the Sawala
              platform default — unlike Crew and Connect, FLOW has no per-project or per-organization default to set
              here.
            </span>
          </p>

          {isOrgAdmin ? (
            <AllowedModelsCard mode="flow" />
          ) : (
            <p className="text-xs text-muted-foreground">Only organization administrators can change which models automations may use.</p>
          )}
        </div>
      </main>
    </div>
  )
}
