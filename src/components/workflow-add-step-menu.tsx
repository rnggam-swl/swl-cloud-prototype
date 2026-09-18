import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { groupsFor, STEP_META, type FlowStepKind } from "@/lib/workflow-data"

export function AddStepMenu({
  kinds,
  onAdd,
}: {
  kinds: FlowStepKind[]
  onAdd: (kind: FlowStepKind) => void
}) {
  const groups = groupsFor(kinds)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-3.5" />
          Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((group, i) => (
          <div key={group.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {group.label}
            </DropdownMenuLabel>
            {group.kinds.map((kind) => {
              const meta = STEP_META[kind]
              const Icon = meta.icon
              return (
                <DropdownMenuItem key={kind} onSelect={() => onAdd(kind)}>
                  <Icon className="size-3.5" style={{ color: meta.accent }} />
                  {meta.label}
                </DropdownMenuItem>
              )
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
