import { Bot, ChevronDown, Pin, Plus, Search, Send, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatSession {
  id: string
  title: string
  updatedAt: string
  pinned?: boolean
}

const pinnedSessions: ChatSession[] = [
  { id: "s1", title: "Q3 policy — leave carry-over", updatedAt: "2h", pinned: true },
]

const recentSessions: ChatSession[] = [
  { id: "s2", title: "Onboarding checklist for new hires", updatedAt: "5h" },
  { id: "s3", title: "How does the refund flow work?", updatedAt: "1d" },
  { id: "s4", title: "Summarize the SOP for Sawala test case", updatedAt: "2d" },
]

function SessionRow({ session }: { session: ChatSession }) {
  return (
    <button
      type="button"
      className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-accent/60"
    >
      <span className="flex w-full items-center gap-1.5">
        {session.pinned && <Pin className="size-3 shrink-0 text-muted-foreground" />}
        <span className="truncate font-medium">{session.title}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">{session.updatedAt}</span>
    </button>
  )
}

export function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="border-b px-3 py-3">
          <Button className="w-full justify-center gap-2" size="sm">
            <Plus className="size-4" />
            New chat
          </Button>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search chats…" className="h-8 pl-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          <div className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Pinned
          </div>
          {pinnedSessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
          <div className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Recent
          </div>
          {recentSessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b bg-background px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
                Q3 policy — leave carry-over
              </h1>
              <Badge
                variant="outline"
                className="shrink-0 rounded-full border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-primary uppercase"
              >
                Internal Chat
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Session · a1b2c3d4e5f6</p>
          </div>
          <Button variant="outline" size="sm">
            <Bot className="size-3.5" />
            GPT-5
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          <div className="flex items-start gap-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback>
                <User className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[85%] flex-col gap-1">
              <div className="rounded-2xl border bg-card px-4 py-2.5 text-sm shadow-sm">
                Can employees carry over unused leave into next quarter?
              </div>
              <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                <span>You</span>
                <span aria-hidden>·</span>
                <span>10:14</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[85%] flex-col gap-1">
              <div className="rounded-2xl border bg-card px-4 py-2.5 text-sm shadow-sm">
                Yes — up to 6 unused days can be carried over into Q3, per the
                leave policy in the internal knowledge base. Anything beyond
                that is forfeited unless approved by a manager.
              </div>
              <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                <Badge className="h-4 rounded-full px-1.5 text-[10px] font-medium">AI</Badge>
                <span aria-hidden>·</span>
                <span>10:14</span>
              </div>
            </div>
          </div>
        </main>

        <footer className="shrink-0 border-t bg-background px-6 py-4">
          <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
            <Input
              placeholder="Ask about an internal policy, runbook, or workflow…"
              className="h-8 border-0 shadow-none focus-visible:ring-0"
            />
            <Button size="icon" className="size-8 shrink-0">
              <Send className="size-4" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
