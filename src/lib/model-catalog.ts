// Ported from Ajena's real `modelDisplay.ts` (sawala-cloud-ui) — the shared
// composer for how a model is described everywhere it's offered. The real
// version derives a cost tier from Cloudflare neuron pricing coefficients per
// model; since this prototype has no real pricing data, each mock model just
// carries its tier directly, but the OUTPUT shape (labelFor/metaLine) matches
// the real functions exactly so every settings page that names a model reads
// the same way production does.

export type ModelCapability = "text" | "audio" | "image" | "tts"

export interface ModelSpec {
  id: string
  label: string
  capability: ModelCapability
  /** Context window in tokens, or 0 for a model with none (image/audio/tts). */
  maxContext: number
  /** Relative AI-compute cost, 1 ($) to 4 ($$$$). */
  costTier: 1 | 2 | 3 | 4
  traits: string
}

export const MODEL_CATALOG: ModelSpec[] = [
  { id: "sawala-mini", label: "Sawala Mini", capability: "text", maxContext: 32000, costTier: 1, traits: "fast" },
  { id: "sawala-pro", label: "Sawala Pro", capability: "text", maxContext: 128000, costTier: 2, traits: "balanced" },
  {
    id: "sawala-multilingual",
    label: "Sawala Multilingual",
    capability: "text",
    maxContext: 64000,
    costTier: 2,
    traits: "fast, multilingual",
  },
  { id: "sawala-vision", label: "Sawala Vision", capability: "text", maxContext: 200000, costTier: 3, traits: "vision, reasoning" },
  {
    id: "sawala-frontier",
    label: "Sawala Frontier",
    capability: "text",
    maxContext: 256000,
    costTier: 4,
    traits: "frontier reasoning",
  },
  { id: "sawala-image-fast", label: "Sawala Image Fast", capability: "image", maxContext: 0, costTier: 1, traits: "fast" },
  { id: "sawala-image-hd", label: "Sawala Image HD", capability: "image", maxContext: 0, costTier: 3, traits: "high detail" },
  { id: "sawala-whisper", label: "Sawala Whisper", capability: "audio", maxContext: 0, costTier: 1, traits: "fast transcription" },
  {
    id: "sawala-voice-natural",
    label: "Sawala Voice Natural",
    capability: "tts",
    maxContext: 0,
    costTier: 2,
    traits: "natural",
  },
]

export function labelFor(allowlist: ModelSpec[], id: string): string {
  return allowlist.find((m) => m.id === id)?.label ?? id
}

export function formatContext(tokens: number): string {
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K ctx`
  return `${tokens} ctx`
}

export function contextFor(allowlist: ModelSpec[], id: string): number | null {
  return allowlist.find((m) => m.id === id)?.maxContext ?? null
}

export function tierMarks(m: ModelSpec): string {
  return "$".repeat(m.costTier)
}

export function tierFor(allowlist: ModelSpec[], id: string): string {
  const m = allowlist.find((x) => x.id === id)
  return m ? tierMarks(m) : ""
}

export function traitsFor(allowlist: ModelSpec[], id: string): string {
  return allowlist.find((m) => m.id === id)?.traits ?? ""
}

// "24K ctx · $$$ · fast" — the one composer every surface uses.
export function metaLine(allowlist: ModelSpec[], id: string): string {
  const ctx = contextFor(allowlist, id)
  return [!ctx ? "" : formatContext(ctx), tierFor(allowlist, id), traitsFor(allowlist, id)]
    .filter(Boolean)
    .join(" · ")
}
