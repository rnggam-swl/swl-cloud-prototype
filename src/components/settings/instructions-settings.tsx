import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AgentDetailDialog, type AgentDetailTab } from "@/components/settings/agent-detail-dialog"
import { ConnectAgentsManager } from "@/components/settings/connect-agents-manager"
import { ModeEditor } from "@/components/settings/agent-instruction-editor"
import { usePersistedSettings } from "@/lib/settings-data"
import type { KbMode } from "@/lib/knowledge-data"
import { cn } from "@/lib/utils"

// When `mode` is provided, the editor is locked to that surface and the
// crew/connect tab bar is hidden — navigation happens via the Settings left
// nav instead. The active Connect agent lives in the URL (`?agent=`, or
// `?newAgent=1` while creating), not in component state, so a link into a
// specific agent's config is shareable and survives a refresh.
export function InstructionsSettings({ mode: fixedMode }: { mode?: KbMode } = {}) {
  const [mode, setMode] = useState<KbMode>(fixedMode ?? "crew")
  const [settings] = usePersistedSettings()
  const [params, setParams] = useSearchParams()
  const isOrgAdmin = true

  const agents = settings.connectAgents
  const agent = params.get("agent") ?? ""
  const creating = params.get("newAgent") === "1"
  const tab: AgentDetailTab = params.get("tab") === "instructions" ? "instructions" : "details"
  const agentExists = agent !== "" && agents.some((a) => a.agentKey === agent)
  const dialogOpen = creating || agentExists

  function openAgent(agentKey: string) {
    setParams({ agent: agentKey })
  }
  function createAgent() {
    setParams({ newAgent: "1" })
  }
  function closeDialog() {
    setParams({})
  }
  function setTab(next: AgentDetailTab) {
    const q = new URLSearchParams(params)
    if (next === "details") q.delete("tab")
    else q.set("tab", next)
    setParams(q, { replace: true })
  }

  function switchMode(m: KbMode) {
    setMode(m)
    if (m === "crew") setParams({}, { replace: true })
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="border-b bg-background px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Agent instructions</h1>
        <p className="text-xs text-muted-foreground">How the assistant behaves — configured separately for each surface.</p>
      </header>

      {!fixedMode && (
        <div className="border-b bg-background px-6">
          <div className="flex gap-1">
            {(["crew", "connect"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2 text-sm capitalize transition-colors",
                  mode === m ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {mode === "connect" ? (
            <>
              <ConnectAgentsManager selected={agentExists ? agent : ""} onOpen={openAgent} onCreate={createAgent} />
              <AgentDetailDialog
                key={creating ? "new" : agent}
                agentKey={creating ? "" : agent}
                mode={mode}
                tab={tab}
                onTabChange={setTab}
                open={dialogOpen}
                onOpenChange={(o) => {
                  if (!o) closeDialog()
                }}
                onCreated={openAgent}
                isOrgAdmin={isOrgAdmin}
              />
            </>
          ) : (
            <ModeEditor mode={mode} isOrgAdmin={isOrgAdmin} agent="general" />
          )}
        </div>
      </main>
    </div>
  )
}
