import { useState } from "react"
import { FlaskConical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  type KbVariant,
  useKnowledgeVariant,
  VARIANT_INFO,
} from "@/lib/knowledge-variant"
import { cn } from "@/lib/utils"

const ORDER: KbVariant[] = ["a", "b", "c"]

export function VariantSwitcher() {
  const { variant, setVariant } = useKnowledgeVariant()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Knowledge access — prototype variants</p>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Switch between competing designs for how documents get scoped to
            agents. Pick lands in localStorage, so it holds across reloads.
          </p>
          <div className="flex flex-col gap-2">
            {ORDER.map((key) => {
              const info = VARIANT_INFO[key]
              const active = variant === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVariant(key)}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {info.label}
                    {active && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Active
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {info.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Button
        size="icon-lg"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full shadow-lg"
        title="Compare knowledge-access prototype variants"
      >
        {open ? <X className="size-5" /> : <FlaskConical className="size-5" />}
      </Button>
    </div>
  )
}
