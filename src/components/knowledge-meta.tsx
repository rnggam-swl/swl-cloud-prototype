import { Bot, Layers } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { KnowledgeDocument } from "@/lib/knowledge-data"
import type { KbVariant, KnowledgeGroup } from "@/lib/knowledge-variant"

export function MetaSeparator() {
  return <span className="text-border">|</span>
}

/** Who-can-see-this tag, shared between the document list and the detail
 * page. Variant C is groups-based, so it always uses the group icon, even
 * for ungrouped ("General") documents — Variant A/B are agent-based, so
 * they keep the agent icon and list every agent with access (including the
 * primary scope, not just the "extra" ones) so the hover is a complete
 * answer, not a partial one. "General" never gets a hover list — with no
 * group and no specific agents, there's nothing to enumerate beyond the
 * fact that every agent can see it. */
export function DocScopeTag({
  doc,
  variant,
  groups,
}: {
  doc: KnowledgeDocument
  variant: KbVariant
  groups: KnowledgeGroup[]
}) {
  const isGrouped = variant === "c" && !!doc.groupId
  const group = isGrouped ? groups.find((g) => g.id === doc.groupId) : undefined
  const isGeneral = doc.scope === "General" && !isGrouped
  const Icon = variant === "c" ? Layers : Bot

  const trigger = (
    <span className="flex items-center gap-1 underline decoration-dotted underline-offset-2">
      <Icon className="size-3" />
      {isGrouped ? (group?.name ?? doc.scope) : doc.scope}
      {!isGrouped && !isGeneral && doc.extraScopes ? ` +${doc.extraScopes.length}` : ""}
    </span>
  )

  if (isGeneral) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="bottom">Visible to all agents</TooltipContent>
      </Tooltip>
    )
  }

  const hoverTitle = isGrouped ? "Agents in this group" : "Agents with access"
  const hoverAgents = isGrouped
    ? (group?.agents ?? [])
    : [doc.scope, ...(doc.extraScopes ?? [])]

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="flex flex-col">
          <span className="font-medium">{hoverTitle}</span>
          {hoverAgents.map((agent) => (
            <span key={agent}>{agent}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
