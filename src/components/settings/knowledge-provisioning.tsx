import { Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePersistedSettings } from "@/lib/settings-data"

// No page header of its own — renders bare inside the Settings config pane,
// unlike its siblings. Mirrors production: a single card whose copy and
// actions depend entirely on the org's current provisioning status.
export function KnowledgeProvisioning() {
  const [settings, setSettings] = usePersistedSettings()
  const status = settings.knowledgeProvisioning.status

  function setStatus(next: typeof status) {
    setSettings((prev) => ({ ...prev, knowledgeProvisioning: { status: next } }))
  }

  function provision() {
    setStatus("provisioning")
    window.setTimeout(() => setStatus("ready"), 1800)
  }

  let title = "Production knowledge base"
  let body: React.ReactNode = null
  let action: React.ReactNode = null

  if (status === "ready") {
    body = (
      <>
        <span className="mb-2 inline-block rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-primary uppercase">
          Isolated · Production
        </span>
        <p>Your organization has a dedicated, isolated knowledge base.</p>
      </>
    )
    action = (
      <Button size="sm" variant="outline" onClick={() => setStatus("inactive")}>
        Deactivate (demo)
      </Button>
    )
  } else if (status === "provisioning") {
    body = <p>Provisioning… migrating your knowledge into the isolated instance. This may take a moment.</p>
  } else if (status === "inactive") {
    body = <p>Knowledge base inactive. Your dedicated instance is parked; re-provision to reactivate it.</p>
    action = (
      <Button size="sm" onClick={provision}>
        Provision production knowledge base
      </Button>
    )
  } else {
    body = (
      <>
        <p className="text-destructive">Provisioning failed — try again.</p>
        <p className="mt-2">
          Move your organization from the shared trial knowledge base to a dedicated, isolated one. This is a
          one-time upgrade covering both Crew and Connect knowledge, and may take a short while to migrate existing
          documents.
        </p>
      </>
    )
    action = (
      <Button size="sm" onClick={provision}>
        Provision production knowledge base
      </Button>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="mt-2 space-y-3 text-sm text-muted-foreground">{body}</div>
      {action && <div className="mt-3">{action}</div>}
    </section>
  )
}
