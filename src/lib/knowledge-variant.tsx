import { createContext, useContext, useEffect, useState } from "react"

// Three competing product directions for "which agents can see this
// document" — kept switchable in the prototype so the team can compare them
// live with stakeholders instead of arguing over static mocks.
export type KbVariant = "a" | "b" | "c"

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
}

// The agent roster itself now lives in Settings → Connect → Agents
// (settings-data.ts's `connectAgents`) — a group's `agents` field holds real
// agent *labels* from that roster, not a placeholder list.
export interface KnowledgeGroup {
  id: string
  name: string
  agents: string[]
}

const DEFAULT_GROUPS: KnowledgeGroup[] = [
  { id: "sales", name: "Sales", agents: ["Sales"] },
  { id: "support", name: "Support", agents: ["Support", "Billing"] },
  { id: "general", name: "General", agents: ["General"] },
]

const VARIANT_STORAGE_KEY = "ajena-kb-variant"
const GROUPS_STORAGE_KEY = "ajena-kb-groups"

function loadVariant(): KbVariant {
  try {
    const raw = window.localStorage.getItem(VARIANT_STORAGE_KEY)
    if (raw === "a" || raw === "b" || raw === "c") return raw
  } catch {
    // ignore
  }
  return "c"
}

function loadGroups(): KnowledgeGroup[] {
  try {
    const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as KnowledgeGroup[]
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_GROUPS
}

const KnowledgeVariantContext = createContext<{
  variant: KbVariant
  setVariant: (v: KbVariant) => void
  groups: KnowledgeGroup[]
  setGroups: React.Dispatch<React.SetStateAction<KnowledgeGroup[]>>
} | null>(null)

export function KnowledgeVariantProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [variant, setVariant] = useState<KbVariant>(loadVariant)
  const [groups, setGroups] = useState<KnowledgeGroup[]>(loadGroups)

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
      value={{ variant, setVariant, groups, setGroups }}
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
