import { createContext, useContext, useEffect, useState } from "react"
import type { KbMode } from "@/lib/knowledge-data"
import { MODEL_CATALOG, type ModelSpec } from "@/lib/model-catalog"

export type { KbMode }

export type ChoiceMode = KbMode | "flow"

export interface ConnectAgent {
  agentKey: string
  label: string
  labelId?: string
  description: string
  enabled: boolean
  welcomeMessage?: string
  /** '' or undefined = inherit the surface's default. */
  model?: string
}

export interface ConnectSuboption {
  subKey: string
  label: string
  labelId?: string
  description?: string
  descriptionId?: string
  sort: number
  instructionOverride?: string
}

export interface InstructionRow {
  project?: string
  orgDefault?: string
}

export interface ModelRow {
  project?: string
  orgDefault?: string
}

export type ArgSource = "model" | "injected" | "fixed"
export type ArgInject = "phone" | "clientId" | "projectId"

export interface ToolArg {
  name: string
  type: "string" | "number" | "integer" | "boolean"
  description?: string
  required?: boolean
  source: ArgSource
  value?: string
  inject?: ArgInject
}

export interface ConnectTool {
  name: string
  description: string
  scriptSlug: string
  functionPath: string
  enabled: boolean
  args: ToolArg[]
}

export interface KodenaScript {
  slug: string
  name: string
}

export const DEPLOYED_KODENA_SCRIPTS: KodenaScript[] = [
  { slug: "order-lookup", name: "order-lookup" },
  { slug: "refund-processor", name: "refund-processor" },
  { slug: "inventory-check", name: "inventory-check" },
]

export interface ConnectMenuSettings {
  menuEnabled: boolean
  menuBody: string
  menuKeyword: string
  includeHuman: boolean
  humanMessage: string
  humanOptionLabel: string
  historyMaxTurns: number | null
  staffNotifyEmail: string
}

export interface ConnectChannel {
  id: string
  type: "messenger" | "instagram"
  name: string
  status: "connected"
}

export interface ConnectWhatsApp {
  status: "disconnected" | "connected"
  phoneNumber: string
  displayName: string
}

export interface ConnectWidgetState {
  enabled: boolean
  whatsapp: ConnectWhatsApp
  channels: ConnectChannel[]
}

export type KnowledgeProvisionStatus = "ready" | "provisioning" | "inactive" | "failed"

export interface SettingsState {
  connectAgents: ConnectAgent[]
  suboptions: Record<string, ConnectSuboption[]>
  instructions: Record<string, InstructionRow>
  modelDefaults: Record<KbMode, ModelRow>
  modelChoices: Record<ChoiceMode, string[]>
  connectMenu: ConnectMenuSettings
  connectWidget: ConnectWidgetState
  tools: ConnectTool[]
  kodena: { connected: boolean; orgHandle: string }
  knowledgeProvisioning: { status: KnowledgeProvisionStatus }
}

export const BUILTIN_INSTRUCTION: Record<KbMode, string> = {
  crew: "You are Ajena, an internal assistant for this project's team. Be concise, cite the knowledge base when relevant, and say when you're unsure.",
  connect:
    "You are Ajena, a WhatsApp assistant speaking on behalf of this organization to its customers. Be warm, concise, and match the customer's language.",
}

export const DEFAULT_MODEL: Record<ChoiceMode, string> = {
  crew: "sawala-pro",
  connect: "sawala-pro",
  flow: "sawala-pro",
}

const initialState: SettingsState = {
  connectAgents: [
    {
      agentKey: "general",
      label: "General",
      description: "Default agent for anything not covered by a specific persona.",
      enabled: true,
    },
    {
      agentKey: "billing",
      label: "Billing",
      labelId: "Tagihan",
      description: "invoices, payments, amounts due, refunds",
      enabled: true,
    },
    {
      agentKey: "sales",
      label: "Sales",
      labelId: "Penjualan",
      description: "pricing, demos, new customers",
      enabled: true,
    },
    {
      agentKey: "support",
      label: "Support",
      labelId: "Dukungan",
      description: "troubleshooting, bug reports, how-to questions",
      enabled: true,
    },
  ],
  suboptions: {},
  instructions: {},
  modelDefaults: { crew: {}, connect: {} },
  modelChoices: { crew: [], connect: [], flow: [] },
  connectMenu: {
    menuEnabled: false,
    menuBody: "",
    menuKeyword: "menu",
    includeHuman: true,
    humanMessage: "",
    humanOptionLabel: "",
    historyMaxTurns: null,
    staffNotifyEmail: "",
  },
  connectWidget: {
    enabled: true,
    whatsapp: { status: "disconnected", phoneNumber: "", displayName: "" },
    channels: [],
  },
  tools: [
    {
      name: "order_lookup",
      description: "Look up an order's status by its order number.",
      scriptSlug: "order-lookup",
      functionPath: "/invoke",
      enabled: true,
      args: [
        { name: "orderId", type: "string", source: "model", required: true, description: "The order number the customer gave." },
        { name: "phone", type: "string", source: "injected", inject: "phone" },
      ],
    },
  ],
  kodena: { connected: true, orgHandle: "ajena-demo" },
  knowledgeProvisioning: { status: "ready" },
}

const STORAGE_KEY = "ajena-settings"

function loadState(): SettingsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as SettingsState
      // connectWidget is merged one level deep so settings saved before the
      // WhatsApp field existed still pick up its default.
      return { ...initialState, ...saved, connectWidget: { ...initialState.connectWidget, ...saved.connectWidget } }
    }
  } catch {
    // Malformed or inaccessible storage — fall back to the seed data below.
  }
  return initialState
}

// Shared Context, not an independent useState-per-component hook — Settings
// is read and written from many sibling components at once (the agent
// roster list, the agent edit dialog, the model cards, ...). An independent
// localStorage hook per component would let them drift: a save in one
// wouldn't appear in another already on screen until it happened to remount.
// Mirrors the same fix already applied to Knowledge's `groups` state.
const SettingsContext = createContext<{
  settings: SettingsState
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>
} | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(loadState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Storage full or blocked (private mode) — state still works in-memory
      // for the rest of this tab's session.
    }
  }, [settings])

  return <SettingsContext.Provider value={{ settings, setSettings }}>{children}</SettingsContext.Provider>
}

export function usePersistedSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error("usePersistedSettings must be used within SettingsProvider")
  }
  return [ctx.settings, ctx.setSettings] as const
}

export interface ResolvedInstruction {
  source: "project" | "org" | "builtin"
  effective: string
  project?: string
  orgDefault?: string
}

export function resolveInstruction(mode: KbMode, agent: string, state: SettingsState): ResolvedInstruction {
  const row = state.instructions[`${mode}:${agent}`] ?? {}
  if (row.project) return { source: "project", effective: row.project, project: row.project, orgDefault: row.orgDefault }
  if (row.orgDefault) return { source: "org", effective: row.orgDefault, project: row.project, orgDefault: row.orgDefault }
  return { source: "builtin", effective: BUILTIN_INSTRUCTION[mode], project: row.project, orgDefault: row.orgDefault }
}

export function catalogFor(mode: ChoiceMode): ModelSpec[] {
  return mode === "flow" ? MODEL_CATALOG : MODEL_CATALOG.filter((m) => m.capability === "text")
}

export function choosableModels(mode: KbMode, state: SettingsState): ModelSpec[] {
  const full = catalogFor(mode)
  const curated = state.modelChoices[mode]
  return curated.length > 0 ? full.filter((m) => curated.includes(m.id)) : full
}

export interface ResolvedModel {
  effective: string
  builtin: string
  orgDefault?: string
  project?: string
  allowlist: ModelSpec[]
}

export function resolveModel(mode: KbMode, state: SettingsState): ResolvedModel {
  const row = state.modelDefaults[mode] ?? {}
  const builtin = DEFAULT_MODEL[mode]
  return {
    effective: row.project ?? row.orgDefault ?? builtin,
    builtin,
    orgDefault: row.orgDefault,
    project: row.project,
    allowlist: choosableModels(mode, state),
  }
}

export function usageFor(
  mode: ChoiceMode,
  id: string,
  state: SettingsState,
): { agents: number; steps: number; sessions: number } {
  const agents = mode === "connect" ? state.connectAgents.filter((a) => a.model === id).length : 0
  return { agents, steps: 0, sessions: 0 }
}

export function lockedModelsFor(mode: ChoiceMode, state: SettingsState): string[] {
  if (mode === "flow") return [DEFAULT_MODEL.flow]
  return [resolveModel(mode, state).effective]
}
