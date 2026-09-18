import { Outlet } from "react-router-dom"
import { SettingsNav } from "@/components/layout/settings-nav"

export function SettingsConfigLayout() {
  return (
    <div className="flex h-full w-full gap-8 overflow-y-auto p-6">
      <SettingsNav />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
