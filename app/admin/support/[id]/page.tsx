"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, User, Bot, Send, CheckCircle, UserPlus } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant" | "admin"
  content: string
  created_at: string
}

interface Conversation {
  id: string
  visitor_id: string
  visitor_name: string | null
  visitor_email: string | null
  status: string
  escalated_at: string | null
  escalated_reason: string | null
  created_at: string
  updated_at: string
}

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversation()
    fetchMessages()

    // Set up real-time subscription for messages
    const supabase = createClient()
    const channel = supabase
      .channel(`conversation-${params.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `conversation_id=eq.${params.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const fetchConversation = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching conversation:", error)
      return
    }

    setConversation(data)
  }

  const fetchMessages = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
      return
    }

    setMessages(data || [])
    setLoading(false)
  }

  const sendAdminMessage = async () => {
    if (!input.trim() || sending) return

    setSending(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({
          conversation_id: params.id,
          role: "admin",
          content: input.trim()
        })

      if (error) throw error

      setInput("")
    } catch (err) {
      console.error("Error sending message:", err)
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (status: string) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("support_conversations")
      .update({ status })
      .eq("id", params.id)

    if (error) {
      console.error("Error updating status:", error)
      return
    }

    setConversation(prev => prev ? { ...prev, status } : null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "escalated":
        return <Badge variant="destructive">Escalated</Badge>
      case "active":
        return <Badge variant="secondary">Active</Badge>
      case "resolved":
        return <Badge variant="outline" className="text-green-500 border-green-500">Resolved</Badge>
      case "closed":
        return <Badge variant="outline">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Conversation not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/support")}>
          Back to Support
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{conversation.visitor_name || "Anonymous"}</h1>
              {getStatusBadge(conversation.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {conversation.visitor_email || "No email provided"} · Started {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {conversation.status !== "resolved" && (
            <Button variant="outline" onClick={() => updateStatus("resolved")}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Resolved
            </Button>
          )}
          {conversation.status === "resolved" && (
            <Button variant="outline" onClick={() => updateStatus("active")}>
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Escalation Info */}
      {conversation.status === "escalated" && conversation.escalated_at && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <UserPlus className="h-5 w-5" />
              <span className="font-medium">Customer requested human support</span>
              <span className="text-sm text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(conversation.escalated_at), { addSuffix: true })}
              </span>
            </div>
            {conversation.escalated_reason && (
              <p className="mt-1 text-sm text-muted-foreground">{conversation.escalated_reason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Conversation</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" && "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : msg.role === "admin"
                    ? "bg-green-500 text-white"
                    : "bg-muted"
                )}>
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : msg.role === "admin" ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col gap-1 max-w-[70%]">
                  <div className={cn(
                    "rounded-2xl px-4 py-2",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : msg.role === "admin"
                      ? "bg-green-500/10 text-foreground border border-green-500/20"
                      : "bg-muted text-foreground"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className={cn(
                    "text-xs text-muted-foreground",
                    msg.role === "user" && "text-right"
                  )}>
                    {msg.role === "admin" ? "You" : msg.role === "assistant" ? "AI" : "Customer"} · {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Admin Reply */}
        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendAdminMessage()
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Type your reply as admin..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
