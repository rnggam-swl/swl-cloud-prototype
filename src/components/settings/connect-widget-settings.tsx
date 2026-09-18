import { useState } from "react"
import { AtSign, MessageCircle, MessagesSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { usePersistedSettings, type ConnectChannel } from "@/lib/settings-data"
import { cn } from "@/lib/utils"

function Card({ icon: Icon, title, children }: { icon: typeof MessagesSquare; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function StatusPill({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase",
        on ? "border-primary/20 bg-primary/10 text-primary" : "text-muted-foreground",
      )}
    >
      {on ? "Enabled" : "Disabled"}
    </span>
  )
}

const CHANNEL_ICON = { messenger: MessageCircle, instagram: AtSign }

export function ConnectWidgetSettings() {
  const [settings, setSettings] = usePersistedSettings()
  const [pendingRemove, setPendingRemove] = useState<ConnectChannel | null>(null)

  function toggleConnect() {
    setSettings((prev) => ({ ...prev, connectWidget: { ...prev.connectWidget, enabled: !prev.connectWidget.enabled } }))
  }

  function connectChannel() {
    const channel: ConnectChannel = {
      id: crypto.randomUUID(),
      type: settings.connectWidget.channels.some((c) => c.type === "messenger") ? "instagram" : "messenger",
      name: settings.connectWidget.channels.some((c) => c.type === "messenger") ? "Ajena Store (Instagram)" : "Ajena Store (Facebook Page)",
      status: "connected",
    }
    setSettings((prev) => ({ ...prev, connectWidget: { ...prev.connectWidget, channels: [...prev.connectWidget.channels, channel] } }))
  }

  function disconnectChannel(id: string) {
    setSettings((prev) => ({ ...prev, connectWidget: { ...prev.connectWidget, channels: prev.connectWidget.channels.filter((c) => c.id !== id) } }))
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Card icon={MessagesSquare} title="Ajena Connect">
        <div className="flex items-center justify-between gap-3">
          <StatusPill on={settings.connectWidget.enabled} />
          <Button size="sm" variant={settings.connectWidget.enabled ? "outline" : "default"} onClick={toggleConnect}>
            {settings.connectWidget.enabled ? "Disable Connect" : "Enable Connect"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Turns the WhatsApp assistant, its staff inbox, and the channels below on or off for this organization.
        </p>
      </Card>

      {settings.connectWidget.enabled && (
        <Card icon={MessageCircle} title="Messenger & Instagram">
          <p className="text-xs text-muted-foreground">Connect a Facebook Page and its linked Instagram account so Ajena can answer there too.</p>

          {settings.connectWidget.channels.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No Page or Instagram account connected yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {settings.connectWidget.channels.map((c) => {
                const Icon = CHANNEL_ICON[c.type]
                return (
                  <li key={c.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Connected
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => setPendingRemove(c)}>
                      Disconnect
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          <Button size="sm" variant="outline" className="mt-3" onClick={connectChannel}>
            Connect Facebook &amp; Instagram
          </Button>
        </Card>
      )}

      <AlertDialog open={pendingRemove !== null} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect this channel?</AlertDialogTitle>
            <AlertDialogDescription>Customers messaging it will no longer be answered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="border-transparent bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingRemove) disconnectChannel(pendingRemove.id)
                setPendingRemove(null)
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
