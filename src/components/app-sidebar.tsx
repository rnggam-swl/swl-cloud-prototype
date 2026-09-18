import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  FolderOpen,
  Gauge,
  History,
  Inbox,
  MessageSquare,
  MessagesSquare,
  Moon,
  Settings,
  Workflow,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  trailing?: React.ComponentType<{ className?: string }>
}

const crewItems: NavItem[] = [
  { label: "Chat", href: "/crew/chat", icon: MessageSquare },
  { label: "Knowledge", href: "/crew/knowledge", icon: BookOpen },
]

const connectItems: NavItem[] = [
  { label: "Conversation", href: "/connect/conversations", icon: MessagesSquare },
  { label: "Knowledge", href: "/connect/knowledge", icon: BookOpen },
]

const flowItems: NavItem[] = [
  { label: "Workflows", href: "/flow/workflows", icon: Workflow },
  { label: "Jobs", href: "/flow/jobs", icon: History },
  { label: "Inbound log", href: "/flow/inbound-log", icon: Inbox },
]

const generalItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Usage", href: "/settings/usage", icon: Gauge },
]

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const { pathname } = useLocation()
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </span>
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.trailing ? (
              <item.trailing className="size-3.5 shrink-0 text-muted-foreground" />
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="flex h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-[49px] items-center gap-2 border-b px-4">
        <div className="flex size-5 items-center justify-center rounded-sm bg-foreground text-[11px] font-bold text-background">
          W
        </div>
        <span className="text-sm font-semibold">Sawala Cloud</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          Beta
        </Badge>
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <MessageSquare className="size-3.5" />
          </span>
          <span className="flex-1 truncate text-left">Ajena</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2 px-3 py-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Project
          </span>
          <Settings className="size-3.5 text-muted-foreground" />
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">Default</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground opacity-50" />
        </button>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <NavGroup title="Crew" items={crewItems} />
        <NavGroup title="Connect" items={connectItems} />
        <NavGroup title="Flow" items={flowItems} />
        <NavGroup title="General" items={generalItems} />
      </nav>

      <Separator />
      <div className="px-3 py-2">
        <a
          href="https://docs.sawala.cloud/en/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <BookOpen className="size-4 shrink-0" />
          <span className="flex-1">Docs</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      </div>

      <Separator />
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
          <Building2 className="size-4 text-white" />
        </div>
        <span className="flex-1 text-sm leading-tight font-medium">
          Wanfah's Organization
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        <Avatar className="size-6 shrink-0">
          <AvatarFallback className="text-[10px]">R</AvatarFallback>
        </Avatar>
        <Moon className="size-3.5 shrink-0 text-muted-foreground" />
      </div>
    </aside>
  )
}
