import { Bot, ChevronDown, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type KnowledgeGroup,
  isGroupVariant,
  useKnowledgeVariant,
} from "@/lib/knowledge-variant"
import { usePersistedSettings } from "@/lib/settings-data"

export interface AgentScopeValue {
  agents: string[]
  groupId?: string
}

export const EMPTY_SCOPE: AgentScopeValue = { agents: [] }

/** Turns the control's selection into the fields the document list/table
 * already knows how to render (scope + extraScopes for the "+N" tooltip,
 * groupId for Variant C's group badge). Takes `groups` as a parameter
 * (rather than reading the hook itself) since callers invoke this from
 * plain event handlers, where hooks can't run. */
export function resolveScopeFields(
  value: AgentScopeValue,
  groups: KnowledgeGroup[],
): {
  scope: string
  extraScopes?: string[]
  groupId?: string
} {
  if (value.groupId) {
    const group = groups.find((g) => g.id === value.groupId)
    return { scope: group?.name ?? "General", groupId: value.groupId }
  }
  if (value.agents.length === 0) {
    return { scope: "General" }
  }
  const [first, ...rest] = value.agents
  return { scope: first, extraScopes: rest.length > 0 ? rest : undefined }
}

/** The "who can see this document" picker inside Upload/Write. Its shape
 * changes per prototype variant — see VARIANT_INFO for what each one means.
 * Variant B renders nothing here on purpose: access is assigned afterward
 * via the row-level "Manage Access" panel, not at creation time. */
export function AgentScopeControl({
  value,
  onChange,
}: {
  value: AgentScopeValue
  onChange: (v: AgentScopeValue) => void
}) {
  const { variant, groups } = useKnowledgeVariant()
  const [settings] = usePersistedSettings()
  const agentLabels = settings.connectAgents.filter((a) => a.enabled).map((a) => a.label)

  if (variant === "b") return null

  if (isGroupVariant(variant)) {
    const group = groups.find((g) => g.id === value.groupId)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            <Layers className="size-4" />
            {group ? group.name : "General (All Agents)"}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onSelect={() => onChange({ agents: [] })}>
            General (All Agents)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Knowledge Groups
          </DropdownMenuLabel>
          {groups.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No groups yet — create one from the toolbar.
            </p>
          )}
          {groups.map((g) => (
            <DropdownMenuItem
              key={g.id}
              onSelect={() => onChange({ agents: [], groupId: g.id })}
            >
              <span className="flex-1">{g.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {g.agents.join(", ")}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Variant A — multi-select. "General" is exclusive: picking it clears any
  // specific agents, and picking any specific agent clears "General".
  const label =
    value.agents.length === 0
      ? "General (All Agents)"
      : value.agents.length === 1
        ? value.agents[0]
        : `${value.agents.length} agents selected`

  function toggleAgent(agent: string, checked: boolean) {
    onChange({
      agents: checked
        ? [...value.agents, agent]
        : value.agents.filter((a) => a !== agent),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          <Bot className="size-4" />
          {label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem onSelect={() => onChange({ agents: [] })}>
          General (All Agents)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {agentLabels.map((agent) => (
          <DropdownMenuCheckboxItem
            key={agent}
            checked={value.agents.includes(agent)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) => toggleAgent(agent, checked === true)}
          >
            {agent}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
