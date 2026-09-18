import { useState } from "react"
import { List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { usePersistedSettings, type ConnectMenuSettings as ConnectMenuSettingsState } from "@/lib/settings-data"
import { cn } from "@/lib/utils"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

const field =
  "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"

// The WhatsApp "welcome menu" shown on new conversations. Menu options
// themselves are auto-derived from the Connect agents roster (Settings →
// Connect → Agents) — this page only configures the menu's framing.
export function ConnectMenuSettings() {
  const [settings, setSettings] = usePersistedSettings()
  const [draft, setDraft] = useState<ConnectMenuSettingsState>(settings.connectMenu)
  const [feedback, setFeedback] = useState<string | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.connectMenu)

  function save() {
    setSettings((prev) => ({ ...prev, connectMenu: draft }))
    setFeedback("Saved.")
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <List className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Welcome menu</h2>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase",
              draft.menuEnabled ? "border-primary/20 bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            {draft.menuEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The list of options a customer sees is derived automatically from your Connect agents roster — add or
          remove agents in Settings → Connect → Agents to change what's offered here.
        </p>

        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={draft.menuEnabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, menuEnabled: v }))} />
            {draft.menuEnabled ? "Menu on" : "Menu off"}
          </label>

          <Field label="Opening message">
            <textarea
              className={cn(field, "resize-y")}
              rows={2}
              value={draft.menuBody}
              onChange={(e) => setDraft((d) => ({ ...d, menuBody: e.target.value }))}
              placeholder="Halo! Dengan apa kami bisa bantu?"
            />
          </Field>

          <Field label="Re-trigger keyword" hint='Customers can type this at any time to see the menu again. Default is "menu".'>
            <input className={field} value={draft.menuKeyword} onChange={(e) => setDraft((d) => ({ ...d, menuKeyword: e.target.value }))} placeholder="menu" />
          </Field>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={draft.includeHuman}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, includeHuman: v === true }))}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium">Include "Talk to a human" option</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                Lets a customer opt out of the assistant and wait for a staff member.
              </span>
            </span>
          </label>

          {draft.includeHuman && (
            <>
              <Field label="Talk to a human — label">
                <input
                  className={field}
                  value={draft.humanOptionLabel}
                  onChange={(e) => setDraft((d) => ({ ...d, humanOptionLabel: e.target.value }))}
                  placeholder="Talk to a human · Bicara dengan manusia"
                  maxLength={24}
                />
              </Field>
              <Field label="Human handoff confirmation">
                <textarea
                  className={cn(field, "resize-y")}
                  rows={2}
                  value={draft.humanMessage}
                  onChange={(e) => setDraft((d) => ({ ...d, humanMessage: e.target.value }))}
                />
              </Field>
            </>
          )}

          <div className="border-t pt-4">
            <Field
              label="Conversation history sent to the assistant"
              hint="How many past turns the assistant sees when it answers. Default 30, range 5–200."
            >
              <input
                type="number"
                min={5}
                max={200}
                className={cn(field, "max-w-[8rem]")}
                value={draft.historyMaxTurns ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, historyMaxTurns: e.target.value ? Number(e.target.value) : null }))}
                placeholder="30"
              />
            </Field>
          </div>

          <div className="border-t pt-4">
            <Field
              label="Staff notification email"
              hint='Where FLOW "Notify staff" steps send when no recipient is set. Leave blank to require each step to name a recipient.'
            >
              <input
                type="email"
                className={cn(field, "max-w-[22rem]")}
                value={draft.staffNotifyEmail}
                onChange={(e) => setDraft((d) => ({ ...d, staffNotifyEmail: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={!dirty}>
            Save
          </Button>
          {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
        </div>
      </section>
    </div>
  )
}
