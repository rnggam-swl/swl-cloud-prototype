import { ModelUsage } from "@/components/settings/model-usage"
import { StorageUsage } from "@/components/settings/storage-usage"

export function UsagePage() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="border-b bg-background px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Usage</h1>
        <p className="text-xs text-muted-foreground">What your organization consumes on this project — storage and AI compute.</p>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <StorageUsage />
          <ModelUsage />
        </div>
      </main>
    </div>
  )
}
