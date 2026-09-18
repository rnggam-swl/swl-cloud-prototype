import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { labelFor, metaLine, type ModelSpec } from "@/lib/model-catalog"
import { cn } from "@/lib/utils"

// The model list a scope's "Change model" button opens. Deliberately separate
// from the confirmation that follows: choosing here doesn't apply anything —
// it hands the choice back and the caller raises a confirm dialog.
export function ModelChoiceDialog({
  open,
  onOpenChange,
  title,
  allowlist,
  selected,
  inherited,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  allowlist: ModelSpec[]
  /** The scope's OWN row (null while inheriting) — what gets the tick. */
  selected: string | null
  /** What this scope falls back to; labels the "use the inherited model" row. */
  inherited: string
  /** `null` means "clear this scope's row and inherit". */
  onChoose: (model: string | null) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Pick the model this scope should use. Nothing is applied until you confirm on the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-2">
          {allowlist.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChoose(m.id)}
              aria-current={selected === m.id}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              )}
            >
              <Check className={cn("mt-0.5 size-3.5 shrink-0", selected === m.id ? "opacity-100" : "opacity-0")} />
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className={cn("text-sm", selected === m.id && "font-medium")}>{m.label}</span>
                <span className="text-[11px] text-muted-foreground">{metaLine(allowlist, m.id)}</span>
              </span>
            </button>
          ))}

          {selected !== null && (
            <>
              <Separator className="my-1.5" />
              <button
                type="button"
                onClick={() => onChoose(null)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                )}
              >
                <Check className="mt-0.5 size-3.5 shrink-0 opacity-0" />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="text-sm">Use the inherited model</span>
                  <span className="text-[11px] text-muted-foreground">{labelFor(allowlist, inherited)}</span>
                </span>
              </button>
            </>
          )}
        </div>

        <p className="px-5 pt-3 pb-5 text-[11px] leading-snug text-muted-foreground">
          <span className="font-medium">$</span>–<span className="font-medium">$$$$</span> is relative AI-compute cost
          (Cloudflare neurons per typical reply), not a monetary price. Larger context and lower cost rarely come
          together.
        </p>
      </DialogContent>
    </Dialog>
  )
}
