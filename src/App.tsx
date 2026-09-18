import { Navigate, Route, HashRouter as Router, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { SettingsConfigLayout } from "@/components/layout/settings-config-layout"
import { ConnectFlowRouting } from "@/components/settings/connect-flow-routing"
import { ConnectMenuSettings } from "@/components/settings/connect-menu-settings"
import { ConnectToolsManager } from "@/components/settings/connect-tools-manager"
import { ConnectWidgetSettings } from "@/components/settings/connect-widget-settings"
import { FlowModelSettings } from "@/components/settings/flow-model-settings"
import { InstructionsSettings } from "@/components/settings/instructions-settings"
import { KnowledgeProvisioning } from "@/components/settings/knowledge-provisioning"
import { ModelSettings } from "@/components/settings/model-settings"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatPage } from "@/pages/chat-page"
import { ConversationsPage } from "@/pages/conversations-page"
import { InboundLogPage } from "@/pages/inbound-log-page"
import { JobsPage } from "@/pages/jobs-page"
import { KnowledgeBasePage } from "@/pages/knowledge-base-page"
import { KnowledgeDetailPage } from "@/pages/knowledge-detail-page"
import { UsagePage } from "@/pages/usage-page"
import { WorkflowDetailPage } from "@/pages/workflow-detail-page"
import { WorkflowNewPage } from "@/pages/workflow-new-page"
import { WorkflowsPage } from "@/pages/workflows-page"
import { KnowledgeVariantProvider } from "@/lib/knowledge-variant"
import { SettingsProvider } from "@/lib/settings-data"

function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <SettingsProvider>
      <KnowledgeVariantProvider>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/crew/chat" replace />} />
            <Route path="crew/chat" element={<ChatPage />} />
            <Route path="crew/knowledge" element={<KnowledgeBasePage mode="crew" />} />
            <Route
              path="crew/knowledge/:itemId"
              element={<KnowledgeDetailPage mode="crew" />}
            />
            <Route path="connect/conversations" element={<ConversationsPage />} />
            <Route path="connect/knowledge" element={<KnowledgeBasePage mode="connect" />} />
            <Route
              path="connect/knowledge/:itemId"
              element={<KnowledgeDetailPage mode="connect" />}
            />
            <Route path="flow/workflows" element={<WorkflowsPage />} />
            <Route path="flow/workflows/new" element={<WorkflowNewPage />} />
            <Route path="flow/workflows/:flowId" element={<WorkflowDetailPage />} />
            <Route path="flow/jobs" element={<JobsPage />} />
            <Route path="flow/inbound-log" element={<InboundLogPage />} />
            <Route path="settings" element={<SettingsConfigLayout />}>
              <Route index element={<Navigate to="/settings/crew/agents" replace />} />
              <Route path="crew/agents" element={<InstructionsSettings key="crew" mode="crew" />} />
              <Route path="crew/model" element={<ModelSettings key="crew" mode="crew" />} />
              <Route path="connect" element={<Navigate to="/settings/connect/agents" replace />} />
              <Route path="connect/agents" element={<InstructionsSettings key="connect" mode="connect" />} />
              <Route path="connect/model" element={<ModelSettings key="connect" mode="connect" />} />
              <Route path="connect/tools" element={<ConnectToolsManager />} />
              <Route path="connect/menus" element={<ConnectMenuSettings />} />
              <Route path="connect/flow" element={<ConnectFlowRouting />} />
              <Route path="connect/widget" element={<ConnectWidgetSettings />} />
              <Route path="flow/model" element={<FlowModelSettings />} />
              <Route path="knowledge" element={<KnowledgeProvisioning />} />
              <Route path="instructions" element={<Navigate to="/settings/crew/agents" replace />} />
            </Route>
            <Route path="settings/usage" element={<UsagePage />} />
            <Route path="settings/storage" element={<Navigate to="/settings/usage" replace />} />
            <Route path="*" element={<Navigate to="/crew/chat" replace />} />
          </Route>
        </Routes>
      </Router>
      </KnowledgeVariantProvider>
      </SettingsProvider>
    </TooltipProvider>
  )
}

export default App
