import { useState } from "react"
import { Users } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { metaLine, type ModelCapability, type ModelSpec } from "@/lib/model-catalog"
import {
  catalogFor,
  lockedModelsFor,
  usageFor,
  usePersistedSettings,
  type ChoiceMode,
} from "@/lib/settings-data"
import { cn } from "@/lib/utils"

const MODE_NOUN: Record<ChoiceMode, string> = {
  crew: "Crew chat",
  connect: "Connect",
  flow: "FLOW automations",
}

const CAPABILITY_HEADING: Record<ModelCapability, string> = {
  text: "AI steps",
  audio: "Transcription",
  image: "Image generation",
  tts: "Voice",
}
const CAPABILITY_ORDER: ModelCapability[] = ["text", "audio", "image", "tts"]

function usageParts(u: { agents: number; steps: number; sessions: number }) {
  const out: string[] = []
  if (u.agents) out.push(`${u.agents} Connect agent${u.agents > 1 ? "s" : ""}`)
  if (u.steps) out.push(`${u.steps} workflow step${u.steps > 1 ? "s" : ""}`)
  if (u.sessions) out.push(`${u.sessions} open conversation${u.sessions > 1 ? "s" : ""}`)
  return out
}

// Which models this organization permits on this surface. A master switch
// reveals a list of per-model switches: no rows means "not curated" (every
// approved model is available), turning it on writes a row for every model
// so curating always has at least one row, and an administrator then turns
// off what they don't want to pay for.
export function AllowedModelsCard({ mode }: { mode: ChoiceMode }) {
  const [settings, setSettings] = usePersistedSettings()
  const [pending, setPending] = useState<{ spec: ModelSpec; next: string[] } | null>(null)

  const allowlist = catalogFor(mode)
  const curated = settings.modelChoices[mode]
  const curating = curated.length > 0
  const on = curating ? curated : allowlist.map((m) => m.id)
  const locked = lockedModelsFor(mode, settings)

  const groups = CAPABILITY_ORDER.map((cap) => [cap, allowlist.filter((m) => m.capability === cap)] as const).filter(
    ([, models]) => models.length > 0,
  )

  function save(next: string[]) {
    setSettings((prev) => ({ ...prev, modelChoices: { ...prev.modelChoices, [mode]: next } }))
  }

  function flip(m: ModelSpec) {
    if (!on.includes(m.id)) {
      save([...on, m.id])
      return
    }
    const next = on.filter((x) => x !== m.id)
    const usage = usageFor(mode, m.id, settings)
    if (usageParts(usage).length === 0) {
      save(next)
      return
    }
    setPending({ spec: m, next })
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">Allowed models</h3>

      <div className="mt-3 flex items-start gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Limit which models this organization can use</span>
          {!curating && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Off — every approved model is available on {MODE_NOUN[mode]}.
            </span>
          )}
        </span>
        <Switch
          checked={curating}
          aria-label="Limit which models this organization can use"
          onCheckedChange={(next) => save(next ? allowlist.map((m) => m.id) : [])}
        />
      </div>

      {curating && (
        <div className="mt-3 grid gap-px">
          {groups.map(([capability, models]) => (
            <div key={capability}>
              {groups.length > 1 && (
                <p className="px-2 pt-3 pb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  {CAPABILITY_HEADING[capability]}
                </p>
              )}
              {models.map((m) => {
                const isOn = on.includes(m.id)
                const isLocked = locked.includes(m.id)
                const uses = usageParts(usageFor(mode, m.id, settings))
                return (
                  <div key={m.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2">
                    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className={cn("text-sm", !isOn && "opacity-50")}>{m.label}</span>
                      <span className="text-[11px] text-muted-foreground">{metaLine(allowlist, m.id)}</span>
                    </span>
                    {isLocked ? (
                      <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                        Default
                      </span>
                    ) : (
                      uses.length > 0 &&
                      isOn && (
                        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                          in use
                        </span>
                      )
                    )}
                    <Switch
                      checked={isOn}
                      disabled={isLocked}
                      aria-label={`${isOn ? "Turn off" : "Turn on"} ${m.label}`}
                      onCheckedChange={() => flip(m)}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 border-t pt-3 text-xs text-muted-foreground">
        <Users className="mt-0.5 size-3.5 shrink-0 opacity-75" />
        <span>
          {curating ? (
            <>
              <span className="font-medium text-foreground">{on.length}</span> of {allowlist.length} available on{" "}
              {MODE_NOUN[mode]}. Models Sawala approves later stay off until you turn them on.
            </>
          ) : (
            <>
              All <span className="font-medium text-foreground">{allowlist.length}</span> models are available,
              including new ones as Sawala adds them.
            </>
          )}
        </span>
      </p>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off {pending?.spec.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              It is currently used by{" "}
              <span className="font-medium text-foreground">
                {pending ? usageParts(usageFor(mode, pending.spec.id, settings)).join(" and ") : ""}
              </span>
              . They fall back to their project default on the next run. Nothing already sent is changed, and you can
              turn it back on at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) save(pending.next)
                setPending(null)
              }}
            >
              Turn it off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
