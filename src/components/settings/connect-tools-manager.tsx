import { useState } from "react"
import { Trash2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  DEPLOYED_KODENA_SCRIPTS,
  usePersistedSettings,
  type ArgInject,
  type ArgSource,
  type ConnectTool,
  type ToolArg,
} from "@/lib/settings-data"
import { cn } from "@/lib/utils"

const NAME_RE = /^[a-zA-Z0-9_]{1,64}$/

const field =
  "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"

function KodenaBanner({
  connected,
  orgHandle,
  onEnable,
  onRotate,
}: {
  connected: boolean
  orgHandle: string
  onEnable: () => void
  onRotate: () => void
}) {
  if (!connected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Connect Kodena to enable tools. We generate an invoke key your scripts use to verify calls.
        </p>
        <Button size="sm" onClick={onEnable}>
          Enable Kodena Tools
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        Kodena connected · handle <span className="font-mono">{orgHandle}</span>
      </p>
      <Button size="sm" variant="outline" onClick={onRotate}>
        Rotate invoke key
      </Button>
    </div>
  )
}

function InvokeKeyReveal({ invokeKey, onDone }: { invokeKey: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Copy this now — it won't be shown again. Set it as <code className="font-mono">AJENA_INVOKE_KEY</code> in your Kodena
        Script.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs">{invokeKey}</code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard?.writeText(invokeKey).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

function LinkedScript({ slug }: { slug: string }) {
  const found = DEPLOYED_KODENA_SCRIPTS.some((s) => s.slug === slug)
  return (
    <span className="flex shrink-0 items-center gap-1">
      <a
        href={`https://kodena.sawala.cloud/dashboard/kodena/scripts/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary"
      >
        {slug} ↗
      </a>
      {!found && (
        <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[10px] text-destructive">
          script not found
        </span>
      )}
    </span>
  )
}

function defaultArg(): ToolArg {
  return { name: "", type: "string", source: "model" }
}

function ArgRow({ arg, onChange, onRemove }: { arg: ToolArg; onChange: (next: ToolArg) => void; onRemove: () => void }) {
  return (
    <div className="grid items-start gap-1.5 sm:grid-cols-[1fr_6rem_6rem_1.5fr_auto]">
      <input className={field} value={arg.name} onChange={(e) => onChange({ ...arg, name: e.target.value })} placeholder="name" />
      <select className={field} value={arg.type} onChange={(e) => onChange({ ...arg, type: e.target.value as ToolArg["type"] })}>
        <option value="string">string</option>
        <option value="number">number</option>
        <option value="integer">integer</option>
        <option value="boolean">boolean</option>
      </select>
      <select className={field} value={arg.source} onChange={(e) => onChange({ ...arg, source: e.target.value as ArgSource })}>
        <option value="model">model</option>
        <option value="injected">injected</option>
        <option value="fixed">fixed</option>
      </select>
      {arg.source === "fixed" ? (
        <input className={field} value={arg.value ?? ""} onChange={(e) => onChange({ ...arg, value: e.target.value })} placeholder="constant value" />
      ) : arg.source === "injected" ? (
        <select className={field} value={arg.inject ?? "phone"} onChange={(e) => onChange({ ...arg, inject: e.target.value as ArgInject })}>
          <option value="phone">phone</option>
          <option value="clientId">clientId</option>
          <option value="projectId">projectId</option>
        </select>
      ) : (
        <input
          className={field}
          value={arg.description ?? ""}
          onChange={(e) => onChange({ ...arg, description: e.target.value })}
          placeholder="description (optional)"
        />
      )}
      <div className="flex items-center gap-1.5">
        {arg.source === "model" && (
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Checkbox checked={arg.required ?? false} onCheckedChange={(v) => onChange({ ...arg, required: v === true })} />
            req
          </label>
        )}
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove argument">
          ✕
        </button>
      </div>
    </div>
  )
}

function ToolForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing: ConnectTool | null
  onCancel: () => void
  onSaved: (tool: ConnectTool) => void
}) {
  const [name, setName] = useState(existing?.name ?? "")
  const [scriptSlug, setScriptSlug] = useState(existing?.scriptSlug ?? DEPLOYED_KODENA_SCRIPTS[0]?.slug ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [functionPath, setFunctionPath] = useState(existing?.functionPath ?? "/invoke")
  const [args, setArgs] = useState<ToolArg[]>(existing?.args ?? [])

  const nameValid = NAME_RE.test(name.trim())
  const argsValid = args.every((a) => a.name.trim().length > 0 && (a.source !== "fixed" || (a.value ?? "").trim().length > 0))
  const canSave = nameValid && description.trim().length > 0 && scriptSlug.trim().length > 0 && argsValid

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Name</label>
          <input className={cn(field, "mt-1 font-mono")} value={name} onChange={(e) => setName(e.target.value)} placeholder="order_lookup" />
          {!nameValid && name.length > 0 && <p className="mt-0.5 text-[10px] text-destructive">Letters, digits, underscore; ≤ 64 chars.</p>}
        </div>
        <div>
          <label className="text-xs font-medium">Kodena Script</label>
          <select className={cn(field, "mt-1")} value={scriptSlug} onChange={(e) => setScriptSlug(e.target.value)}>
            {DEPLOYED_KODENA_SCRIPTS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium">Description</label>
        <textarea
          className={cn(field, "mt-1 resize-none")}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One sentence — the assistant uses this to decide when to call the tool."
        />
      </div>
      <div>
        <label className="text-xs font-medium">Function path</label>
        <input className={cn(field, "mt-1 max-w-[16rem] font-mono")} value={functionPath} onChange={(e) => setFunctionPath(e.target.value)} placeholder="/invoke" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Arguments</label>
          <Button size="sm" variant="ghost" onClick={() => setArgs((a) => [...a, defaultArg()])}>
            Add argument
          </Button>
        </div>
        {args.length === 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">No arguments — the tool takes no input.</p>
        ) : (
          <div className="mt-1.5 space-y-1.5">
            {args.map((a, i) => (
              <ArgRow
                key={i}
                arg={a}
                onChange={(next) => setArgs((prev) => prev.map((x, idx) => (idx === i ? next : x)))}
                onRemove={() => setArgs((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Source <span className="font-medium">model</span> = filled by the assistant from the message ·{" "}
          <span className="font-medium">injected</span> = filled by Sawala from the conversation (phone / client /
          project) · <span className="font-medium">fixed</span> = a constant. Injected &amp; fixed args are never
          guessed by the model.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() =>
            onSaved({
              name: name.trim(),
              scriptSlug,
              description: description.trim(),
              functionPath: functionPath.trim() || "/invoke",
              enabled: existing?.enabled ?? true,
              args,
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function TestPanel({ tool, onClose }: { tool: ConnectTool; onClose: () => void }) {
  const [argsText, setArgsText] = useState("{}")
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run() {
    try {
      JSON.parse(argsText)
      setError(null)
      setResult(JSON.stringify({ ok: true, tool: tool.name, script: tool.scriptSlug, receivedAt: new Date().toISOString() }, null, 2))
    } catch {
      setError("Invalid JSON.")
      setResult(null)
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold">
          Test <span className="font-mono">{tool.name}</span>
        </h4>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <textarea className={cn(field, "resize-y font-mono")} rows={3} value={argsText} onChange={(e) => setArgsText(e.target.value)} />
      <Button size="sm" onClick={run}>
        Run test
      </Button>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {result && <pre className="overflow-x-auto rounded-md border bg-background p-2 font-mono text-[10px]">{result}</pre>}
    </div>
  )
}

export function ConnectToolsManager() {
  const [settings, setSettings] = usePersistedSettings()
  const [editing, setEditing] = useState<ConnectTool | "new" | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ name: string } | null>(null)
  const [pendingRotate, setPendingRotate] = useState(false)
  const [revealKey, setRevealKey] = useState<string | null>(null)

  const { connected, orgHandle } = settings.kodena
  const tools = settings.tools

  function saveTool(tool: ConnectTool) {
    setSettings((prev) => {
      const exists = prev.tools.some((t) => t.name === tool.name)
      return { ...prev, tools: exists ? prev.tools.map((t) => (t.name === tool.name ? tool : t)) : [...prev.tools, tool] }
    })
    setEditing(null)
    setFeedback("Tool saved.")
  }

  function removeTool(name: string) {
    setSettings((prev) => ({ ...prev, tools: prev.tools.filter((t) => t.name !== name) }))
  }

  function newInvokeKey() {
    return `ajk_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Tools</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Functions the WhatsApp assistant can call mid-reply, backed by a Kodena Script.</p>
        </div>
        {connected && editing === null && (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add tool
          </Button>
        )}
      </div>

      <div className="mt-3">
        <KodenaBanner
          connected={connected}
          orgHandle={orgHandle}
          onEnable={() => {
            const key = newInvokeKey()
            setSettings((prev) => ({ ...prev, kodena: { ...prev.kodena, connected: true } }))
            setRevealKey(key)
          }}
          onRotate={() => setPendingRotate(true)}
        />
      </div>

      {revealKey && (
        <div className="mt-3">
          <InvokeKeyReveal invokeKey={revealKey} onDone={() => setRevealKey(null)} />
        </div>
      )}

      {connected && (
        <>
          {tools.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No tools yet. Add one to get started.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {tools.map((t) => (
                <li key={t.name} className="rounded-lg border bg-background px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{t.name}</span>
                    {!t.enabled && <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">disabled</span>}
                    <LinkedScript slug={t.scriptSlug} />
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setTesting(testing === t.name ? null : t.name)}>
                        Test
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDelete({ name: t.name })}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</p>
                  {testing === t.name && <TestPanel tool={t} onClose={() => setTesting(null)} />}
                </li>
              ))}
            </ul>
          )}

          {editing !== null && (
            <ToolForm existing={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={saveTool} />
          )}
        </>
      )}

      {feedback && <p className="mt-2 text-xs text-muted-foreground">{feedback}</p>}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tool?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.name}</span> will be removed from your
              tools, and the assistant will stop calling it during replies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) removeTool(pendingDelete.name)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingRotate} onOpenChange={(open) => !open && setPendingRotate(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the invoke key?</AlertDialogTitle>
            <AlertDialogDescription>
              Every script using the old key will stop working until you update it with the new key. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setRevealKey(newInvokeKey())
                setPendingRotate(false)
              }}
            >
              Rotate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
