import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  BUILTIN_INSTRUCTION,
  resolveInstruction,
  usePersistedSettings,
  type KbMode,
} from "@/lib/settings-data"

export const MAX_INSTRUCTION_LEN = 8000

const SOURCE_LABEL: Record<string, string> = {
  project: "Using project instruction",
  org: "Inheriting org default",
  builtin: "Using built-in default",
}

function InstructionField({
  label,
  hint,
  value,
  onChange,
  onSave,
  onReset,
  hasRow,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onReset: () => void
  hasRow: boolean
}) {
  const trimmed = value.trim()
  const tooLong = value.length > MAX_INSTRUCTION_LEN
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className={cn("text-[10px]", tooLong ? "text-destructive" : "text-muted-foreground")}>
          {value.length} / {MAX_INSTRUCTION_LEN}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
        placeholder="Leave empty to inherit."
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={!trimmed || tooLong}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onReset} disabled={!hasRow}>
          Reset to inherited
        </Button>
      </div>
    </section>
  )
}

// `agent` is the Connect sub-agent whose instruction this editor edits. Crew
// always passes 'general'. `onDirtyChange` reports whether either field holds
// an unsaved draft, so a parent dialog can warn before discarding it.
export function ModeEditor({
  mode,
  isOrgAdmin,
  agent = "general",
  onDirtyChange,
}: {
  mode: KbMode
  isOrgAdmin: boolean
  agent?: string
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [settings, setSettings] = usePersistedSettings()
  const [projectDraft, setProjectDraft] = useState<string | null>(null)
  const [orgDraft, setOrgDraft] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const resolved = resolveInstruction(mode, agent, settings)
  const projectValue = projectDraft ?? resolved.project ?? ""
  const orgValue = orgDraft ?? resolved.orgDefault ?? ""

  const dirty = projectDraft !== null || orgDraft !== null
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  function writeRow(patch: { project?: string | null; orgDefault?: string | null }) {
    const key = `${mode}:${agent}`
    setSettings((prev) => {
      const row = prev.instructions[key] ?? {}
      const next = { ...row }
      if (patch.project !== undefined) {
        if (patch.project === null) delete next.project
        else next.project = patch.project
      }
      if (patch.orgDefault !== undefined) {
        if (patch.orgDefault === null) delete next.orgDefault
        else next.orgDefault = patch.orgDefault
      }
      return { ...prev, instructions: { ...prev.instructions, [key]: next } }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wider text-primary uppercase">
            {SOURCE_LABEL[resolved.source]}
          </span>
        </div>
        <pre className="mt-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {resolved.effective || BUILTIN_INSTRUCTION[mode]}
        </pre>
      </div>

      <InstructionField
        label="Project instruction"
        hint="Overrides the org default for this project on this surface."
        value={projectValue}
        onChange={setProjectDraft}
        onSave={() => {
          writeRow({ project: projectValue.trim() })
          setProjectDraft(null)
          setFeedback("Project instruction saved.")
        }}
        onReset={() => {
          writeRow({ project: null })
          setProjectDraft(null)
          setFeedback("Reset to inherited.")
        }}
        hasRow={Boolean(resolved.project)}
      />

      {isOrgAdmin && (
        <InstructionField
          label="Organization default"
          hint="Applies to every project in this org (on this surface) that has no override. Org admins only."
          value={orgValue}
          onChange={setOrgDraft}
          onSave={() => {
            writeRow({ orgDefault: orgValue.trim() })
            setOrgDraft(null)
            setFeedback("Org default saved.")
          }}
          onReset={() => {
            writeRow({ orgDefault: null })
            setOrgDraft(null)
            setFeedback("Org default reset.")
          }}
          hasRow={Boolean(resolved.orgDefault)}
        />
      )}

      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  )
}
