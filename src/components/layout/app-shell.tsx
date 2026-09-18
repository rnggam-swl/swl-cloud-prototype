import { Bell } from "lucide-react"
import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"

export function AppShell() {
  return (
    <div className="flex h-svh bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[49px] shrink-0 items-center justify-end border-b px-6">
          <Button variant="ghost" size="icon">
            <Bell className="size-4" />
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden [&>*]:min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
