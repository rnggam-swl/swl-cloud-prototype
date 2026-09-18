import { useNavigate, useSearchParams } from "react-router-dom"
import { WorkflowBuilder } from "@/components/workflow-builder"
import { TemplatePicker } from "@/components/workflow-template-picker"
import { STARTER_TEMPLATES, usePersistedWorkflows } from "@/lib/workflow-data"

export function WorkflowNewPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [workflows, setWorkflows] = usePersistedWorkflows()
  const template = params.get("template")

  if (!template) {
    return (
      <div className="space-y-4 p-6">
        <TemplatePicker
          onPick={(tpl) => setParams({ template: tpl ? tpl.id : "blank" })}
          onCancel={() => navigate("/flow/workflows")}
        />
      </div>
    )
  }

  const seedTemplate = template === "blank" ? null : (STARTER_TEMPLATES.find((t) => t.id === template) ?? null)
  const otherWorkflows = workflows.map((w) => ({ value: w.id, label: w.name }))

  return (
    <div className="p-6">
      <WorkflowBuilder
        seedTemplate={seedTemplate}
        otherWorkflows={otherWorkflows}
        onDone={(workflow, message) => {
          setWorkflows((prev) => [workflow, ...prev])
          navigate(`/flow/workflows?saved=${encodeURIComponent(message)}`)
        }}
        onCancel={() => navigate("/flow/workflows")}
      />
    </div>
  )
}
