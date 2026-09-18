import { useState } from "react"
import { ArrowDown, Pin } from "lucide-react"
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
import { AllowedModelsCard } from "@/components/settings/allowed-models-card"
import { ModelChoiceDialog } from "@/components/settings/model-choice-dialog"
import { labelFor, metaLine, type ModelSpec } from "@/lib/model-catalog"
import { resolveModel, usePersistedSettings, type KbMode } from "@/lib/settings-data"
import { cn } from "@/lib/utils"

type ModelScope = "project" | "org"
type Provenance = "own" | "org" | "builtin"

const SCOPE_COPY: Record<KbMode, Record<ModelScope, { title: string; hint: string }>> = {
  crew: {
    project: {
      title: "Project default",
      hint: "The model new conversations in this project start on. Anyone can switch their own conversation from the chat header.",
    },
    org: {
      title: "Organization default",
      hint: "The starting model for every project in this organization that has none of its own. Organization administrators only.",
    },
  },
  connect: {
    project: {
      title: "Project default",
      hint: "The model Connect agents in this project answer with, unless an agent has been given a model of its own in Agents.",
    },
    org: {
      title: "Organization default",
      hint: "The starting model for Connect in every project in this organization that has none of its own. Organization administrators only.",
    },
  },
}

const PROVENANCE_COPY: Record<ModelScope, Record<Provenance, string>> = {
  project: {
    own: "Set for this project.",
    org: "Inherited from the organization default.",
    builtin: "Inherited from the Sawala platform default.",
  },
  org: {
    own: "Set for this organization.",
    org: "Inherited from the Sawala platform default.",
    builtin: "Inherited from the Sawala platform default.",
  },
}

const BLAST_RADIUS: Record<KbMode, Record<ModelScope, string>> = {
  crew: {
    project:
      "New conversations in this project will start on it. Conversations that have already chosen a model of their own keep it.",
    org: "New conversations will start on it in every project in this organization that has no default of its own.",
  },
  connect: {
    project:
      "Every Connect agent in this project that has no model of its own will answer with it, from the next inbound message. Agents with their own model keep it.",
    org: "Connect agents will answer with it in every project in this organization that has no default of its own and whose agents have none.",
  },
}

type PendingModelChange = { scope: ModelScope; model: string | null; resulting: string }

function viewFor(
  scope: ModelScope,
  resolved: ReturnType<typeof resolveModel>,
  orgDefault: string | undefined,
): { resolved: string; provenance: Provenance; own: string | null; inherited: string } {
  const builtin = resolved.builtin
  if (scope === "org") {
    return orgDefault
      ? { resolved: orgDefault, provenance: "own", own: orgDefault, inherited: builtin }
      : { resolved: builtin, provenance: "builtin", own: null, inherited: builtin }
  }
  if (resolved.project) {
    return { resolved: resolved.project, provenance: "own", own: resolved.project, inherited: orgDefault ?? builtin }
  }
  if (orgDefault) {
    return { resolved: orgDefault, provenance: "org", own: null, inherited: orgDefault }
  }
  return { resolved: builtin, provenance: "builtin", own: null, inherited: builtin }
}

function ModelScopeCard({
  scope,
  title,
  hint,
  allowlist,
  resolved,
  provenance,
  ownValue,
  onChangeModel,
  onReset,
  feedback,
}: {
  scope: ModelScope
  title: string
  hint: string
  allowlist: ModelSpec[]
  resolved: string
  provenance: Provenance
  ownValue: string | null
  onChangeModel: () => void
  onReset: () => void
  feedback: string | null
}) {
  const ProvenanceIcon = provenance === "own" ? Pin : ArrowDown
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>

      <p className="mt-4 text-xl font-semibold tracking-tight">{labelFor(allowlist, resolved)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{metaLine(allowlist, resolved)}</p>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ProvenanceIcon className="size-3.5 shrink-0 opacity-75" />
        <span>{PROVENANCE_COPY[scope][provenance]}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onChangeModel}>
          Change model
        </Button>
        {ownValue !== null && (
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset to inherited
          </Button>
        )}
      </div>

      {feedback && <p className="mt-3 text-xs text-muted-foreground">{feedback}</p>}
    </section>
  )
}

function ModeEditor({ mode, isOrgAdmin }: { mode: KbMode; isOrgAdmin: boolean }) {
  const [settings, setSettings] = usePersistedSettings()
  const [feedback, setFeedback] = useState<Record<ModelScope, string | null>>({ project: null, org: null })
  const [picking, setPicking] = useState<ModelScope | null>(null)
  const [pending, setPending] = useState<PendingModelChange | null>(null)

  const resolved = resolveModel(mode, settings)
  const row = settings.modelDefaults[mode] ?? {}
  const allowlist = resolved.allowlist

  function apply(scope: ModelScope, model: string | null) {
    setSettings((prev) => {
      const prevRow = prev.modelDefaults[mode] ?? {}
      const nextRow = { ...prevRow }
      const field = scope === "project" ? "project" : "orgDefault"
      if (model === null) delete nextRow[field]
      else nextRow[field] = model
      return { ...prev, modelDefaults: { ...prev.modelDefaults, [mode]: nextRow } }
    })
    setFeedback((f) => ({
      ...f,
      [scope]: model === null ? "Reset to inherited." : `${scope === "project" ? "Project" : "Organization"} default saved.`,
    }))
  }

  function ask(scope: ModelScope, model: string | null) {
    const v = viewFor(scope, resolved, row.orgDefault)
    setPending({ scope, model, resulting: model ?? v.inherited })
  }

  const scopes: ModelScope[] = isOrgAdmin ? ["project", "org"] : ["project"]

  const resetLanding = (scope: ModelScope) =>
    scope === "project" && row.orgDefault
      ? "This project will go back to the organization default."
      : `This ${scope === "project" ? "project" : "organization"} will go back to the Sawala platform default.`

  return (
    <div className="space-y-4">
      {scopes.map((scope) => {
        const v = viewFor(scope, resolved, row.orgDefault)
        return (
          <ModelScopeCard
            key={scope}
            scope={scope}
            title={SCOPE_COPY[mode][scope].title}
            hint={SCOPE_COPY[mode][scope].hint}
            allowlist={allowlist}
            resolved={v.resolved}
            provenance={v.provenance}
            ownValue={v.own}
            onChangeModel={() => setPicking(scope)}
            onReset={() => ask(scope, null)}
            feedback={feedback[scope]}
          />
        )
      })}

      {isOrgAdmin && <AllowedModelsCard mode={mode} />}

      {picking !== null &&
        (() => {
          const v = viewFor(picking, resolved, row.orgDefault)
          return (
            <ModelChoiceDialog
              open
              onOpenChange={(open) => !open && setPicking(null)}
              title={`Change the ${SCOPE_COPY[mode][picking].title.toLowerCase()}`}
              allowlist={allowlist}
              selected={v.own}
              inherited={v.inherited}
              onChoose={(model) => {
                const scope = picking
                setPicking(null)
                if (model === v.own) return
                ask(scope, model)
              }}
            />
          )
        })()}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.model === null
                ? "Reset to the inherited model?"
                : `Change the ${pending ? SCOPE_COPY[mode][pending.scope].title.toLowerCase() : "model"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.model === null && `${resetLanding(pending.scope)} `}
              <span className={cn("font-medium text-foreground")}>{pending ? labelFor(allowlist, pending.resulting) : ""}</span>
              {pending && metaLine(allowlist, pending.resulting) ? ` — ${metaLine(allowlist, pending.resulting)}` : ""}. {" "}
              {pending ? BLAST_RADIUS[mode][pending.scope] : ""} Conversations already in progress are not rewritten,
              and you can change it back at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending.scope, pending.model)
                setPending(null)
              }}
            >
              {pending?.model === null ? "Reset" : "Change model"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// When `mode` is provided, the editor is locked to that surface and the
// crew/connect tab bar is hidden — navigation happens via the Settings left
// nav instead.
export function ModelSettings({ mode: fixedMode }: { mode?: KbMode } = {}) {
  const [mode, setMode] = useState<KbMode>(fixedMode ?? "crew")
  const isOrgAdmin = true

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="border-b bg-background px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Model</h1>
        <p className="text-xs text-muted-foreground">
          Which Sawala-approved language model this surface starts on. Takes effect on the next turn — no deploy.
        </p>
      </header>

      {!fixedMode && (
        <div className="border-b bg-background px-6">
          <div className="flex gap-1">
            {(["crew", "connect"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
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
          <ModeEditor mode={mode} isOrgAdmin={isOrgAdmin} />
        </div>
      </main>
    </div>
  )
}
