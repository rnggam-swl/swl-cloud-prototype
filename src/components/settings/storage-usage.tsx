import { useState } from "react"
import { HardDrive, RefreshCw } from "lucide-react"
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

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—"
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / 1024 ** i
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[i]}`
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US")
}

interface StorageKnowledgeBase {
  instanceId: string
  type: "dedicated" | "shared"
  vectors: number | null
  bytes: number | null
}

const MOCK_STORAGE = {
  conversations: 1842,
  messages: 24910,
  attachments: { count: 486, bytes: 327155712 },
  knowledgeBases: [
    { instanceId: "kb_ajena_default", type: "dedicated", vectors: 12430, bytes: 88080384 },
    { instanceId: "kb_ajena_connect", type: "shared", vectors: null, bytes: null },
  ] as StorageKnowledgeBase[],
  measuredAt: "16 Sep 2026, 09:00",
}

export function StorageUsage() {
  const [refreshing, setRefreshing] = useState(false)

  function refresh() {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 500)
  }

  const hasShared = MOCK_STORAGE.knowledgeBases.some((kb) => kb.type === "shared")

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Storage usage</h2>
        </div>
        <Button size="sm" variant="ghost" aria-label="Refresh storage usage" onClick={refresh}>
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Conversations" value={formatCount(MOCK_STORAGE.conversations)} />
          <Stat label="Messages" value={formatCount(MOCK_STORAGE.messages)} />
          <Stat
            label={`Attachments${MOCK_STORAGE.attachments.count > 0 ? ` (${formatBytes(MOCK_STORAGE.attachments.bytes)})` : ""}`}
            value={formatCount(MOCK_STORAGE.attachments.count)}
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Knowledge bases</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Instance</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Vectors</th>
                  <th className="px-3 py-2 text-right font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_STORAGE.knowledgeBases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-xs text-muted-foreground">
                      No knowledge instance found.
                    </td>
                  </tr>
                ) : (
                  MOCK_STORAGE.knowledgeBases.map((kb) => (
                    <tr key={kb.instanceId} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{kb.instanceId}</td>
                      <td className="px-3 py-2 capitalize">{kb.type}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{kb.vectors === null ? "—" : formatCount(kb.vectors)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatBytes(kb.bytes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {hasShared && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Vector counts are only shown for a dedicated instance — a shared trial instance holds many
              organizations' knowledge and isn't attributable per organization.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Last measured {MOCK_STORAGE.measuredAt}
          {refreshing ? " · refreshing…" : ""}
        </p>
      </div>
    </section>
  )
}
