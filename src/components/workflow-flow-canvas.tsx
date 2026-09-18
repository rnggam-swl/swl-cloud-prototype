// Ported from Ajena FLOW's real `FlowCanvas.tsx` (sawala-cloud-ui) as closely as
// this prototype's stack allows — same n8n-style canvas, same interactions
// (click to activate, drag to connect/disconnect, insert-after menu, hover to
// remove), same edge legend. Adapted only where this prototype has no backend:
// no server-side step-error validation, no real run engine (the run overlay is
// still fully supported and driven by the mock Test-run panel).

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Connection,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"
import {
  TRIGGER_ID,
  flowToGraph,
  layoutLR,
  splitDeps,
  wouldCycle,
  type FlowEdgeKind,
  type FlowGraphEdge,
  type FlowGraphNode,
  type FlowNodeData,
  type FlowRunOverlay,
} from "@/lib/flow-to-graph"
import {
  STEP_META,
  groupsFor,
  ALL_STEP_KINDS,
  type FlowStepKind,
  type StepRunStatus,
  type WorkflowSummary,
} from "@/lib/workflow-data"

const MENU_W = 208
const MENU_MAX_H = 420

function InsertMenu({ onPick }: { onPick: (kind: FlowStepKind) => void }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const groups = groupsFor(ALL_STEP_KINDS)
    const H = Math.min(MENU_MAX_H, ALL_STEP_KINDS.length * 30 + groups.length * 22 + 8)
    const x = Math.min(r.right + 12, window.innerWidth - MENU_W - 8)
    const y = Math.min(Math.max(8, r.top + r.height / 2 - H / 2), window.innerHeight - H - 8)
    setAt({ x, y })
  }

  return (
    <span className="nodrag nopan" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        className="absolute top-1/2 -right-2.5 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-xs leading-none text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
        onClick={() => (at ? setAt(null) : openMenu())}
        title="Insert a step after this one"
        aria-label="Insert a step after this one"
      >
        +
      </button>
      {at &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setAt(null)} aria-hidden />
            <div
              className="fixed z-[61] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 shadow-lg"
              style={{ left: at.x, top: at.y, width: MENU_W, maxHeight: MENU_MAX_H }}
              onClick={(e) => e.stopPropagation()}
            >
              {groupsFor(ALL_STEP_KINDS).map((g) => (
                <div key={g.label}>
                  <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {g.label}
                  </p>
                  {g.kinds.map((k) => {
                    const Icon = STEP_META[k].icon
                    return (
                      <button
                        key={k}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                        onClick={() => {
                          onPick(k)
                          setAt(null)
                        }}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: STEP_META[k].accent }} />
                        {STEP_META[k].label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </>,
          document.body,
        )}
    </span>
  )
}

function FlowNode({ id, data }: NodeProps<FlowGraphNode>) {
  const {
    title,
    subtitle,
    accent,
    icon: Icon,
    kind,
    disabled,
    activatable,
    errorCount,
    runStatus,
    onInsert,
    onRemove,
    connectable,
  } = data as FlowNodeData
  const broken = (errorCount ?? 0) > 0
  return (
    <div
      className={cn(
        "group/node relative flex w-[220px] items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm",
        runStatus && RUN_TINT[runStatus],
        disabled && "border-dashed opacity-50",
        activatable && "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/40",
        broken && "border-destructive/50",
      )}
      style={{ borderLeft: `4px solid ${accent}` }}
      title={broken ? `${errorCount} issue${errorCount === 1 ? "" : "s"} — click to fix` : undefined}
    >
      {broken && (
        <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-destructive-foreground shadow">
          {errorCount}
        </span>
      )}
      {kind !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          title="Drag to or from here to change what this step waits for"
          className={cn(
            connectable
              ? "hover:!scale-125 group-hover/node:!bg-muted-foreground !h-2.5 !w-2.5 !border !border-background !bg-muted-foreground/60 transition-all hover:!bg-primary"
              : "!opacity-0",
          )}
          style={connectable ? undefined : { pointerEvents: "none" }}
        />
      )}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs leading-tight font-semibold">
          {title}
          {disabled && <span className="ml-1 font-normal text-muted-foreground">· Disabled</span>}
        </span>
        <span className="block truncate text-[10px] tracking-wide text-muted-foreground uppercase">{subtitle}</span>
      </span>
      <Handle
        type="source"
        position={Position.Right}
        title="Drag to or from here to change what runs after this step"
        className={cn(
          connectable && kind !== "trigger"
            ? "hover:!scale-125 group-hover/node:!bg-muted-foreground !h-2.5 !w-2.5 !border !border-background !bg-muted-foreground/60 transition-all hover:!bg-primary"
            : "!opacity-0",
        )}
        style={connectable && kind !== "trigger" ? undefined : { pointerEvents: "none" }}
      />
      {onRemove && kind !== "trigger" && (
        <button
          className="nodrag nopan absolute -top-2 -left-2 z-10 hidden h-4 w-4 items-center justify-center rounded-full border bg-card text-[10px] leading-none text-muted-foreground shadow-sm group-hover/node:flex hover:border-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(id)
          }}
          title="Remove this step"
          aria-label="Remove this step"
        >
          ✕
        </button>
      )}
      {onInsert && <InsertMenu onPick={(kind) => onInsert(id, kind)} />}
    </div>
  )
}

const nodeTypes: NodeTypes = { flowNode: FlowNode }

function FlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps<FlowGraphEdge>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const onDelete = data?.onDelete as
    | ((e: { source: string; target: string; kind?: FlowEdgeKind }) => void)
    | undefined
  const kind = data?.edgeKind
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute flex items-center gap-1"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {label && (
            <span className="rounded border bg-background/90 px-1 text-[9px] leading-tight text-muted-foreground">
              {label}
            </span>
          )}
          {selected && onDelete && (
            <button
              className="pointer-events-auto flex h-4 w-4 items-center justify-center rounded-full border bg-card text-[10px] leading-none text-muted-foreground shadow-sm hover:border-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete({ source, target, kind })
              }}
              title="Remove this connection"
              aria-label="Remove this connection"
            >
              ✕
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes: EdgeTypes = { flowEdge: FlowEdge }

const RUN_TINT: Record<string, string> = {
  succeeded: "bg-emerald-500/10 ring-1 ring-emerald-500/30",
  failed: "bg-destructive/10 ring-1 ring-destructive/30",
  skipped: "bg-muted ring-1 ring-border",
  running:
    "bg-blue-500/10 ring-2 ring-blue-500 dark:ring-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.15)] motion-safe:animate-pulse",
}

function RunLegend({ overlay }: { overlay?: FlowRunOverlay }) {
  const items: Array<[string, string]> = [
    ["Running", "bg-blue-500/40 ring-1 ring-blue-500"],
    ["Succeeded", "bg-emerald-500/30"],
    ["Failed", "bg-destructive/40"],
    ["Skipped", "bg-muted-foreground/30"],
    ["Not run", "bg-card border"],
  ]
  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="font-medium">
          {overlay ? `Run ${overlay.runId.slice(0, 8)} · ${overlay.status}` : "Last run:"}
        </span>
        {items.map(([label, swatch]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn("h-2.5 w-2.5 rounded-sm", swatch)} />
            {label}
          </span>
        ))}
      </div>
      {overlay && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4" style={{ background: "var(--flow-run-active)" }} />
            Running now
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4" style={{ background: "var(--flow-run-taken)" }} />
            Path taken
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-0.5 w-4 opacity-45"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--flow-run-untaken) 0 2px, transparent 2px 7px)",
              }}
            />
            Not taken
          </span>
        </div>
      )}
    </div>
  )
}

function EdgeLegend() {
  const items: Array<{ label: string; stroke: string; dash: string; title: string }> = [
    {
      label: "Runs after",
      stroke: "#94a3b8",
      dash: "",
      title: "You set this order. Drag between two steps to add one, or select the line and remove it.",
    },
    {
      label: "Passes data",
      stroke: "#94a3b8",
      dash: "2 3",
      title:
        "The next step reads this step's output, so it has to wait for it. This is the line you get when a step's configuration points at another step — including when you add a step with +, which fills that in for you. To change it, edit the later step's configuration; the line follows.",
    },
    {
      label: "Skipped if the branch is false",
      stroke: "#f59e0b",
      dash: "5 4",
      title: "Part of a branch step's skip list. Edit the branch step to change what it skips.",
    },
  ]
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      <span className="font-medium">Lines:</span>
      {items.map(({ label, stroke, dash, title }) => (
        <span key={label} className="flex cursor-help items-center gap-1" title={title}>
          <svg width="18" height="6" aria-hidden>
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke={stroke}
              strokeWidth="1.5"
              {...(dash ? { strokeDasharray: dash } : {})}
            />
          </svg>
          {label}
        </span>
      ))}
    </div>
  )
}

export function WorkflowFlowCanvas({
  flow,
  onNodeActivate,
  stepErrors,
  runStatus,
  runOverlay,
  onInsertAfter,
  onRemoveStep,
  onConnectSteps,
  onDisconnectSteps,
}: {
  flow: WorkflowSummary
  onNodeActivate?: (nodeId: string) => void
  stepErrors?: Record<string, string[]>
  runStatus?: Record<string, StepRunStatus>
  runOverlay?: FlowRunOverlay
  onInsertAfter?: (afterNodeId: string, kind: FlowStepKind) => void
  onRemoveStep?: (stepId: string) => void
  onConnectSteps?: (sourceId: string, targetId: string) => void
  onDisconnectSteps?: (sourceId: string, targetId: string) => void
}) {
  const activatable = Boolean(onNodeActivate)
  const hasRunHistory = Boolean(runOverlay) || Boolean(runStatus && Object.keys(runStatus).length > 0)

  const insertRef = useRef(onInsertAfter)
  useEffect(() => {
    insertRef.current = onInsertAfter
  }, [onInsertAfter])
  const stableInsert = useCallback(
    (afterNodeId: string, kind: FlowStepKind) => insertRef.current?.(afterNodeId, kind),
    [],
  )
  const canInsert = Boolean(onInsertAfter)

  const removeRef = useRef(onRemoveStep)
  useEffect(() => {
    removeRef.current = onRemoveStep
  }, [onRemoveStep])
  const stableRemove = useCallback((stepId: string) => removeRef.current?.(stepId), [])
  const canRemove = Boolean(onRemoveStep)

  const canConnect = Boolean(onConnectSteps)
  const canDisconnect = Boolean(onDisconnectSteps)

  const [edgeNotice, setEdgeNotice] = useState<{ text: string; openStepId?: string } | null>(null)

  const disconnectRef = useRef(onDisconnectSteps)
  useEffect(() => {
    disconnectRef.current = onDisconnectSteps
  }, [onDisconnectSteps])

  const stableEdgeDelete = useCallback((e: { source: string; target: string; kind?: FlowEdgeKind }) => {
    if (e.kind === "explicit") {
      setEdgeNotice(null)
      disconnectRef.current?.(e.source, e.target)
      return
    }
    if (e.kind === "inferred") {
      setEdgeNotice({
        text: `${e.target} reads ${e.source}'s output, so it has to wait for it. That link lives in ${e.target}'s configuration — if you added ${e.target} with the + button, it was filled in for you — so removing the line here would not stick. Open ${e.target} and take out {{steps.${e.source}.output}}, and the line goes with it.`,
        openStepId: e.target,
      })
      return
    }
    if (e.kind === "skip") {
      setEdgeNotice({
        text: `This is ${e.source}'s "skip if false" list, not a dependency. Edit the branch step to change what it skips.`,
        openStepId: e.source,
      })
      return
    }
    setEdgeNotice({
      text: `${e.target} has no dependencies, so it runs right after the trigger. There is nothing to remove — give it a dependency and this link goes away on its own.`,
    })
  }, [])

  const [refusal, setRefusal] = useState<string | null>(null)
  const refusalRef = useRef<string | null>(null)

  const isValidConnection = useCallback(
    (c: Connection | Edge) => {
      const source = c.source
      const target = c.target
      if (!source || !target) return false

      const reject = (why: string) => {
        refusalRef.current = why
        return false
      }

      if (source === TRIGGER_ID) {
        return reject(
          "A step runs right after the trigger whenever it has no other dependencies — there is no trigger link to draw.",
        )
      }
      if (target === TRIGGER_ID) {
        return reject("Nothing can run before the trigger.")
      }
      if (source === target) {
        return reject("A step cannot wait for itself.")
      }

      const targetStep = flow.steps.find((s) => s.id === target)
      if (!targetStep) return false
      const validIds = new Set(flow.steps.map((s) => s.id))
      const { inferred, explicit } = splitDeps(targetStep, validIds)
      if (explicit.includes(source)) {
        return reject(`${target} already runs after ${source}.`)
      }
      if (inferred.includes(source)) {
        return reject(`${target} already waits for ${source} — it reads that step's output.`)
      }
      if (wouldCycle(flow.steps, source, target)) {
        return reject(`That would make ${source} and ${target} wait for each other.`)
      }

      refusalRef.current = null
      return true
    },
    [flow.steps],
  )

  const { nodes, edges } = useMemo(() => {
    const graph = flowToGraph(flow, { stepErrors, runStatus, runOverlay })
    const withAffordance = graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        activatable,
        ...(canInsert ? { onInsert: stableInsert } : {}),
        ...(canRemove && n.data.kind !== "trigger" ? { onRemove: stableRemove } : {}),
        connectable: canConnect,
      },
    }))
    const withDelete: FlowGraphEdge[] = canDisconnect
      ? graph.edges.map((e) => ({
          ...e,
          type: "flowEdge",
          data: { ...(e.data ?? { edgeKind: "explicit" }), onDelete: stableEdgeDelete },
        }))
      : graph.edges
    return { nodes: layoutLR(withAffordance, graph.edges) as FlowGraphNode[], edges: withDelete }
  }, [
    flow,
    activatable,
    stepErrors,
    runStatus,
    runOverlay,
    canInsert,
    stableInsert,
    canRemove,
    stableRemove,
    canConnect,
    canDisconnect,
    stableEdgeDelete,
  ])

  return (
    <>
      <div
        className="h-[70vh] min-h-[420px] overflow-hidden rounded-lg border bg-background"
        style={
          {
            "--xy-controls-button-background-color": "var(--card)",
            "--xy-controls-button-background-color-hover": "var(--accent)",
            "--xy-controls-button-color": "var(--foreground)",
            "--xy-controls-button-color-hover": "var(--foreground)",
            "--xy-controls-button-border-color": "var(--border)",
          } as CSSProperties
        }
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={canConnect}
          nodesDraggable={false}
          elementsSelectable={activatable}
          onNodeClick={onNodeActivate ? (_, node) => onNodeActivate(node.id) : undefined}
          {...(canConnect
            ? {
                isValidConnection,
                onConnect: (c: Connection) => {
                  if (!c.source || !c.target) return
                  setRefusal(null)
                  onConnectSteps?.(c.source, c.target)
                },
                onConnectEnd: () => {
                  if (refusalRef.current) {
                    setRefusal(refusalRef.current)
                    refusalRef.current = null
                  }
                },
              }
            : {})}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {edgeNotice && (
        <div className="mt-2 flex items-start gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-[11px] text-foreground">
          <span className="flex-1">{edgeNotice.text}</span>
          {edgeNotice.openStepId && onNodeActivate && (
            <button
              className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
              onClick={() => {
                const id = edgeNotice.openStepId!
                setEdgeNotice(null)
                onNodeActivate(id)
              }}
            >
              Open {edgeNotice.openStepId}
            </button>
          )}
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setEdgeNotice(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {refusal && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-foreground">
          <span className="flex-1">Cannot connect: {refusal}</span>
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setRefusal(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      <EdgeLegend />
      {hasRunHistory && <RunLegend overlay={runOverlay} />}
    </>
  )
}
