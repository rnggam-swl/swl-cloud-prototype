import { createContext, useCallback, useContext, useEffect, useState } from "react"

// Three competing product directions for "which agents can see this
// document" — kept switchable in the prototype so the team can compare them
// live with stakeholders instead of arguing over static mocks.
export type KbVariant = "a" | "b" | "c" | "d"

export const VARIANT_INFO: Record<
  KbVariant,
  { label: string; description: string }
> = {
  a: {
    label: "A · Multi-select agents",
    description:
      "Pick any combination of agents per document at upload/write time. “General (All Agents)” is exclusive with specific agents.",
  },
  b: {
    label: "B · Access routing",
    description:
      "Documents upload with no agent scope. Access is assigned afterward per document via a separate “Manage Access” panel.",
  },
  c: {
    label: "C · Knowledge Groups",
    description:
      "Documents belong to one named group (e.g. Sales, Support). Agents subscribe to groups instead of individual documents.",
  },
  d: {
    label: "D · Knowledge Groups (Groups tab)",
    description:
      "Same model as C, but groups are managed on their own tab next to Knowledge, with a detail page per group for its agents and documents.",
  },
}

/** C and D share the Knowledge Groups model — they differ only in where
 * groups are managed (a dialog vs. their own tab and detail page). */
export function isGroupVariant(variant: KbVariant): boolean {
  return variant === "c" || variant === "d"
}

// The agent roster itself now lives in Settings → Connect → Agents
// (settings-data.ts's `connectAgents`) — a group's `agents` field holds real
// agent *labels* from that roster, not a placeholder list.
export interface KnowledgeGroup {
  id: string
  name: string
  agents: string[]
  /** ISO timestamp — when the group was created. */
  createdAt: string
  /** ISO timestamp — last change to what the group is: its name, its agents,
   * or which documents belong to it. Stamped automatically for name/agent
   * changes; document moves call `touchGroups`. */
  updatedAt: string
}

// No seed "General" group on purpose — General is the implicit ungrouped
// state (an agent/document with no group membership), not a group you join.
// A named group called "General" would be redundant with that and confusing
// (it would mean "only visible to General-group members," the opposite of
// what "general knowledge" is supposed to mean).
const DEFAULT_GROUPS: KnowledgeGroup[] = [
  {
    id: "sales",
    name: "Sales",
    agents: ["Sales"],
    createdAt: "2026-07-28T10:00:00+07:00",
    updatedAt: "2026-08-12T16:20:00+07:00",
  },
  {
    id: "support",
    name: "Support",
    agents: ["Support", "Billing"],
    createdAt: "2026-07-28T10:05:00+07:00",
    updatedAt: "2026-07-28T10:05:00+07:00",
  },
]

/** A slug id for a new group, suffixed ("sales-2") if it's already taken. */
export function newGroupId(name: string, existing: KnowledgeGroup[]): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "group"
  const taken = new Set(existing.map((g) => g.id))
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

const VARIANT_STORAGE_KEY = "ajena-kb-variant"
const GROUPS_STORAGE_KEY = "ajena-kb-groups"

function loadVariant(): KbVariant {
  try {
    const raw = window.localStorage.getItem(VARIANT_STORAGE_KEY)
    if (raw === "a" || raw === "b" || raw === "c" || raw === "d") return raw
  } catch {
    // ignore
  }
  return "c"
}

function loadGroups(): KnowledgeGroup[] {
  try {
    const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY)
    if (raw) {
      // Groups saved before timestamps existed get "now" for both.
      const now = new Date().toISOString()
      return (JSON.parse(raw) as KnowledgeGroup[]).map((g) => ({
        ...g,
        createdAt: g.createdAt ?? now,
        updatedAt: g.updatedAt ?? g.createdAt ?? now,
      }))
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_GROUPS
}

const KnowledgeVariantContext = createContext<{
  variant: KbVariant
  setVariant: (v: KbVariant) => void
  groups: KnowledgeGroup[]
  /** Creating a group may omit its timestamps; renaming it or changing its
   * agents bumps updatedAt automatically. */
  setGroups: (action: GroupsAction) => void
  /** Bumps updatedAt on these groups — for document moves in or out, which
   * live in document state this provider can't see. Falsy ids are ignored. */
  touchGroups: (ids: (string | undefined)[]) => void
} | null>(null)

type GroupDraft = Omit<KnowledgeGroup, "createdAt" | "updatedAt"> &
  Partial<Pick<KnowledgeGroup, "createdAt" | "updatedAt">>
type GroupsAction = GroupDraft[] | ((prev: KnowledgeGroup[]) => GroupDraft[])

function sameAgents(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x))
}

export function KnowledgeVariantProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [variant, setVariant] = useState<KbVariant>(loadVariant)
  const [groups, setGroupsState] = useState<KnowledgeGroup[]>(loadGroups)

  const setGroups = useCallback((action: GroupsAction) => {
    setGroupsState((prev) => {
      const next = typeof action === "function" ? action(prev) : action
      const now = new Date().toISOString()
      return next.map((g) => {
        const old = prev.find((p) => p.id === g.id)
        if (!old) return { ...g, createdAt: g.createdAt ?? now, updatedAt: g.updatedAt ?? now }
        const changed = old.name !== g.name || !sameAgents(old.agents, g.agents)
        return { ...g, createdAt: old.createdAt, updatedAt: changed ? now : (g.updatedAt ?? old.updatedAt) }
      })
    })
  }, [])

  const touchGroups = useCallback((ids: (string | undefined)[]) => {
    const set = new Set(ids.filter(Boolean))
    if (set.size === 0) return
    const now = new Date().toISOString()
    setGroupsState((prev) => prev.map((g) => (set.has(g.id) ? { ...g, updatedAt: now } : g)))
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(VARIANT_STORAGE_KEY, variant)
    } catch {
      // storage full/blocked — in-memory state still works this session
    }
  }, [variant])

  useEffect(() => {
    try {
      window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups))
    } catch {
      // storage full/blocked — in-memory state still works this session
    }
  }, [groups])

  return (
    <KnowledgeVariantContext.Provider
      value={{ variant, setVariant, groups, setGroups, touchGroups }}
    >
      {children}
    </KnowledgeVariantContext.Provider>
  )
}

export function useKnowledgeVariant() {
  const ctx = useContext(KnowledgeVariantContext)
  if (!ctx) {
    throw new Error(
      "useKnowledgeVariant must be used within KnowledgeVariantProvider",
    )
  }
  return ctx
}
