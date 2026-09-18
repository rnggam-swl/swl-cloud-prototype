import { Link, useLocation } from "react-router-dom"
import { Bot, Cpu, Database, MessageSquare, MessagesSquare, Workflow, Wrench, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const groups: { heading: string; items: { label: string; href: string; icon: LucideIcon }[] }[] = [
  {
    heading: "Crew",
    items: [
      { label: "Agents", href: "/settings/crew/agents", icon: Bot },
      { label: "Model", href: "/settings/crew/model", icon: Cpu },
    ],
  },
  {
    heading: "Connect",
    items: [
      { label: "Agents", href: "/settings/connect/agents", icon: Bot },
      { label: "Model", href: "/settings/connect/model", icon: Cpu },
      { label: "Tools", href: "/settings/connect/tools", icon: Wrench },
      { label: "Menus", href: "/settings/connect/menus", icon: MessagesSquare },
      { label: "Flow routing", href: "/settings/connect/flow", icon: Workflow },
      { label: "Widget", href: "/settings/connect/widget", icon: MessageSquare },
    ],
  },
  {
    heading: "Flow",
    items: [{ label: "Model", href: "/settings/flow/model", icon: Cpu }],
  },
  {
    heading: "Knowledge",
    items: [{ label: "Provisioning", href: "/settings/knowledge", icon: Database }],
  },
]

export function SettingsNav() {
  const location = useLocation()
  return (
    <nav className="w-52 shrink-0 space-y-5">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{group.heading}</p>
          <div className="space-y-0.5">
            {group.items.map(({ label, href, icon: Icon }) => {
              const active = location.pathname === href || location.pathname.startsWith(href + "/")
              return (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
