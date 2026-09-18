import {
  Bot,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Search,
  Send,
  User,
  UserCog,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Conversation {
  id: string
  name: string
  lastText: string
  updatedAt: string
  mode: "ai" | "human"
}

const conversations: Conversation[] = [
  {
    id: "c1",
    name: "+62 812-3456-7890",
    lastText: "Terima kasih infonya!",
    updatedAt: "2m ago",
    mode: "ai",
  },
  {
    id: "c2",
    name: "Budi Santoso",
    lastText: "↩ I'll check the invoice and get back to you.",
    updatedAt: "18m ago",
    mode: "human",
  },
  {
    id: "c3",
    name: "+62 856-1122-3344",
    lastText: "Apakah bisa reschedule jadwal besok?",
    updatedAt: "1h ago",
    mode: "ai",
  },
]

function ModeBadge({ mode }: { mode: Conversation["mode"] }) {
  return (
    <Badge variant={mode === "ai" ? "secondary" : "default"} className="mt-1 w-fit gap-1">
      {mode === "ai" ? <Bot className="size-3" /> : <UserCog className="size-3" />}
      {mode === "ai" ? "AI answering" : "Human"}
    </Badge>
  )
}

export function ConversationsPage() {
  const active = conversations[0]

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <MessagesSquare className="size-4 shrink-0" />
          <h2 className="min-w-0 truncate text-sm font-semibold">Conversations</h2>
          <Button size="icon" variant="ghost" className="ml-auto size-7">
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
        <div className="border-b px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search conversations" className="h-8 pl-8 text-sm" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`flex w-full flex-col gap-0.5 border-b px-4 py-3 transition-colors ${
                c.id === active.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{c.updatedAt}</span>
              </div>
              <span className="truncate text-xs text-muted-foreground">{c.lastText}</span>
              <ModeBadge mode={c.mode} />
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{active.name}</p>
            <p className="text-xs text-muted-foreground">{active.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeBadge mode={active.mode} />
            <Button size="sm" variant="outline">
              <UserCog className="size-4" />
              Take over
            </Button>
            <Button size="icon" variant="outline" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex items-start gap-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback>
                <User className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[75%] flex-col gap-1">
              <div className="rounded-2xl border bg-card px-3.5 py-2 text-sm shadow-sm">
                Halo, saya mau tanya soal status pesanan saya.
              </div>
              <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                <span>Customer</span>
                <span aria-hidden>·</span>
                <span>09:41</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row-reverse items-start gap-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[75%] flex-col items-end gap-1">
              <div className="rounded-2xl border bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
                Halo! Pesanan Anda sedang dalam proses pengiriman dan
                diperkirakan sampai dalam 2 hari kerja.
              </div>
              <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                <Badge className="h-4 rounded-full px-1.5 text-[10px] font-medium">AI</Badge>
                <span aria-hidden>·</span>
                <span>09:42</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback>
                <User className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[75%] flex-col gap-1">
              <div className="rounded-2xl border bg-card px-3.5 py-2 text-sm shadow-sm">
                Terima kasih infonya!
              </div>
              <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                <span>Customer</span>
                <span aria-hidden>·</span>
                <span>09:43</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
            <Input
              placeholder="Type a reply…"
              className="h-8 border-0 shadow-none focus-visible:ring-0"
            />
            <Button size="icon" className="size-8 shrink-0">
              <Send className="size-4" />
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
