import { Link, useNavigate, useParams } from "react-router-dom"
import { WorkflowBuilder } from "@/components/workflow-builder"
import { usePersistedWorkflows } from "@/lib/workflow-data"

export function WorkflowDetailPage() {
  const { flowId } = useParams()
  const navigate = useNavigate()
  const [workflows, setWorkflows] = usePersistedWorkflows()
  const workflow = workflows.find((w) => w.id === flowId)

  if (!workflow) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3 p-6">
        <p className="text-sm text-muted-foreground">Workflow not found.</p>
        <Link to="/flow/workflows" className="text-sm text-primary hover:underline">
          ← Back to workflows
        </Link>
      </div>
    )
  }

  const otherWorkflows = workflows
    .filter((w) => w.id !== flowId)
    .map((w) => ({ value: w.id, label: w.name }))

  return (
    <div className="p-6">
      <WorkflowBuilder
        key={workflow.id}
        initial={workflow}
        otherWorkflows={otherWorkflows}
        onDone={(updated, message) => {
          setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
          navigate(`/flow/workflows?saved=${encodeURIComponent(message)}`)
        }}
        onCancel={() => navigate("/flow/workflows")}
      />
    </div>
  )
}
