// Ported from Ajena FLOW's real `flowToGraph.ts` (sawala-cloud-ui) as closely as
// this prototype's data shapes allow — pure mapping from a workflow to React Flow
// nodes/edges, plus the same dagre auto-layout. No React, no DOM here.

import dagre from "@dagrejs/dagre"
import { MarkerType, type Edge, type Node } from "@xyflow/react"
import type { LucideIcon } from "lucide-react"
import {
  STEP_META,
  TRIGGER_META,
  TRIGGER_ACCENT,
  triggerSummary,
  type FlowStepKind,
  type StepRunStatus,
  type WorkflowStep,
  type WorkflowSummary,
} from "@/lib/workflow-data"

export const TRIGGER_ID = "__trigger__"
const NODE_W = 220
const NODE_H = 64

export interface FlowNodeData extends Record<string, unknown> {
  title: string
  subtitle: string
  accent: string
  icon: LucideIcon
  kind: FlowStepKind | "trigger"
  disabled?: boolean
  activatable?: boolean
  errorCount?: number
  runStatus?: StepRunStatus
  onInsert?: (afterNodeId: string, kind: FlowStepKind) => void
  onRemove?: (stepId: string) => void
  connectable?: boolean
}

export type FlowGraphNode = Node<FlowNodeData>

// explicit — an author-set dependsOn entry. Addable and removable.
// inferred — implied by {{steps.<id>.output}} in the target's config. Not
//            removable from the graph: edit the config instead.
// skip     — a branch step's config.skip list, dashed "skip if false".
// trigger  — synthetic: drawn from the trigger to any step with no deps.
export type FlowEdgeKind = "explicit" | "inferred" | "skip" | "trigger"

export type FlowEdgeRunState = "active" | "taken" | "not-taken"

export interface FlowEdgeData extends Record<string, unknown> {
  edgeKind: FlowEdgeKind
  runState?: FlowEdgeRunState
}

export interface FlowRunOverlay {
  runId: string
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
  stepStatus: Record<string, "succeeded" | "failed" | "skipped">
  running: string[]
}

export function classifyEdge(
  source: string,
  target: string,
  overlay: FlowRunOverlay,
): FlowEdgeRunState | undefined {
  const sourceDone = source === TRIGGER_ID || overlay.stepStatus[source] === "succeeded"
  if (!sourceDone) return undefined
  if (overlay.running.includes(target)) return "active"
  const t = overlay.stepStatus[target]
  if (t === "succeeded" || t === "failed") return "taken"
  if (t === "skipped") return "not-taken"
  return undefined
}

export type FlowGraphEdge = Edge<FlowEdgeData>

const STEP_REF_RE = /\{\{\s*steps\.([a-zA-Z0-9_]+)/g

export function referencedStepIds(configText: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  STEP_REF_RE.lastIndex = 0
  while ((m = STEP_REF_RE.exec(configText || ""))) {
    const id = m[1]!
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

export function splitDeps(
  step: WorkflowStep,
  validIds: Set<string>,
): { inferred: string[]; explicit: string[] } {
  const keep = (d: string) => d !== step.id && validIds.has(d)
  const inferred = [...new Set(referencedStepIds(JSON.stringify(step.config ?? {})).filter(keep))]
  const inferredSet = new Set(inferred)
  const explicit = [...new Set((step.dependsOn ?? []).filter((d) => keep(d) && !inferredSet.has(d)))]
  return { inferred, explicit }
}

function effectiveDeps(step: WorkflowStep, validIds: Set<string>): string[] {
  const { inferred, explicit } = splitDeps(step, validIds)
  return [...new Set([...explicit, ...inferred])]
}

export function wouldCycle(steps: WorkflowStep[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true
  const validIds = new Set(steps.map((s) => s.id))
  const byId = new Map(steps.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const stack = [sourceId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (id === targetId) return true
    if (seen.has(id)) continue
    seen.add(id)
    const step = byId.get(id)
    if (step) stack.push(...effectiveDeps(step, validIds))
  }
  return false
}

function branchSkipTargets(step: WorkflowStep): string[] {
  if (step.kind !== "branch") return []
  const skip = (step.config as { skip?: unknown } | undefined)?.skip
  return Array.isArray(skip) ? skip.filter((s): s is string => typeof s === "string") : []
}

export function flowToGraph(
  flow: WorkflowSummary,
  opts?: {
    stepErrors?: Record<string, string[]>
    runStatus?: Record<string, StepRunStatus>
    runOverlay?: FlowRunOverlay
  },
): { nodes: FlowGraphNode[]; edges: FlowGraphEdge[] } {
  const validIds = new Set(flow.steps.map((s) => s.id))

  const tMeta = TRIGGER_META[flow.trigger.kind]
  const triggerNode: FlowGraphNode = {
    id: TRIGGER_ID,
    type: "flowNode",
    position: { x: 0, y: 0 },
    data: {
      title: tMeta.label,
      subtitle: triggerSummary(flow.trigger),
      accent: TRIGGER_ACCENT,
      icon: tMeta.icon,
      kind: "trigger",
    },
  }

  const stepNodes: FlowGraphNode[] = flow.steps.map((s) => {
    const meta = STEP_META[s.kind]
    return {
      id: s.id,
      type: "flowNode",
      position: { x: 0, y: 0 },
      data: {
        title: s.name?.trim() || s.id,
        subtitle: meta?.label ?? s.kind,
        accent: meta?.accent ?? "#64748b",
        icon: meta?.icon ?? STEP_META.transform.icon,
        kind: s.kind,
        disabled: s.enabled === false,
        errorCount: opts?.stepErrors?.[s.id]?.length ?? 0,
        runStatus: opts?.runOverlay
          ? opts.runOverlay.running.includes(s.id)
            ? "running"
            : opts.runOverlay.stepStatus[s.id]
          : opts?.runStatus?.[s.id],
      },
    }
  })

  const edges: FlowGraphEdge[] = []
  const seen = new Set<string>()
  const styleFor = (kind: FlowEdgeKind): Pick<FlowGraphEdge, "style" | "label"> => {
    if (kind === "skip") {
      return { style: { strokeDasharray: "5 4", stroke: "#f59e0b" }, label: "skip if false" }
    }
    if (kind === "inferred") {
      return { style: { strokeDasharray: "2 3", stroke: "#94a3b8" }, label: "passes data" }
    }
    return {}
  }
  const runClass: Record<FlowEdgeRunState, string> = {
    active: "flow-edge-active",
    taken: "flow-edge-taken",
    "not-taken": "flow-edge-not-taken",
  }
  const runStyle: Record<FlowEdgeRunState, Record<string, unknown>> = {
    active: { stroke: "var(--flow-run-active)", strokeWidth: 2.5 },
    taken: { stroke: "var(--flow-run-taken)", strokeWidth: 2 },
    "not-taken": { stroke: "var(--flow-run-untaken)", strokeDasharray: "2 5", opacity: 0.7 },
  }
  const decorate = (e: FlowGraphEdge, runState: FlowEdgeRunState | undefined) => {
    if (!runState) return
    e.className = runClass[runState]
    e.style = { ...(e.style ?? {}), ...runStyle[runState] }
    if (runState === "active") e.animated = true
  }
  const addEdge = (source: string, target: string, kind: FlowEdgeKind) => {
    const id = `e-${source}-${target}`
    if (seen.has(id)) return
    seen.add(id)
    const runState = opts?.runOverlay ? classifyEdge(source, target, opts.runOverlay) : undefined
    const edge: FlowGraphEdge = {
      id,
      source,
      target,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { edgeKind: kind, runState },
      ...styleFor(kind),
    }
    decorate(edge, runState)
    edges.push(edge)
  }

  for (const s of flow.steps) {
    const { inferred, explicit } = splitDeps(s, validIds)
    if (inferred.length === 0 && explicit.length === 0) {
      addEdge(TRIGGER_ID, s.id, "trigger")
    } else {
      for (const d of explicit) addEdge(d, s.id, "explicit")
      for (const d of inferred) addEdge(d, s.id, "inferred")
    }
  }

  for (const s of flow.steps) {
    for (const target of branchSkipTargets(s)) {
      if (!validIds.has(target)) continue
      const id = `e-${s.id}-${target}`
      if (seen.has(id)) {
        const e = edges.find((x) => x.id === id)
        if (e) {
          const runState = opts?.runOverlay ? classifyEdge(s.id, target, opts.runOverlay) : undefined
          e.data = { edgeKind: "skip", runState }
          Object.assign(e, styleFor("skip"))
          decorate(e, runState)
        }
      } else {
        addEdge(s.id, target, "skip")
      }
    }
  }

  return { nodes: [triggerNode, ...stepNodes], edges }
}

// Auto-layout the graph left-to-right with dagre, matching n8n's canvas.
export function layoutLR(nodes: FlowGraphNode[], edges: Edge[]): FlowGraphNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 36, ranksep: 90, marginx: 16, marginy: 16 })
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const p = g.node(n.id)
    return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } }
  })
}
