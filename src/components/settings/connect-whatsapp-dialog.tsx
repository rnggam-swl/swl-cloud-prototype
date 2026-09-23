import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePersistedSettings } from "@/lib/settings-data"

// Self-contained so it can be opened from anywhere — today from the WhatsApp
// card in Settings → Connect → Widget, later possibly straight from the
// Conversations empty-state CTA. The real flow will be Meta's embedded signup;
// this prototype just records the number as connected.
export function ConnectWhatsAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, setSettings] = usePersistedSettings()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [displayName, setDisplayName] = useState("")

  const canConnect = phoneNumber.replace(/\D/g, "").length >= 8 && displayName.trim() !== ""

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPhoneNumber("")
      setDisplayName("")
    }
    onOpenChange(next)
  }

  function connect() {
    setSettings((prev) => ({
      ...prev,
      connectWidget: {
        ...prev.connectWidget,
        whatsapp: { status: "connected", phoneNumber: phoneNumber.trim(), displayName: displayName.trim() },
      },
    }))
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle>Connect WhatsApp</DialogTitle>
          <DialogDescription>
            Link a WhatsApp Business number so Ajena can answer customers who message it.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (canConnect) connect()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone" className="text-xs font-medium">
              Business phone number
            </Label>
            <Input
              id="wa-phone"
              inputMode="tel"
              placeholder="+62 812-3456-7890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-name" className="text-xs font-medium">
              Display name
            </Label>
            <Input
              id="wa-name"
              placeholder="Ajena Store"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Shown to customers as the sender name in WhatsApp.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canConnect}>
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
