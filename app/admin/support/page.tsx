"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, User, Clock, AlertCircle, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Conversation {
  id: string
  visitor_id: string
  visitor_name: string | null
  visitor_email: string | null
  status: string
  escalated_at: string | null
  created_at: string
  updated_at: string
  message_count?: number
}

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "escalated" | "active" | "resolved">("all")

  useEffect(() => {
    fetchConversations()
    
    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('support-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchConversations = async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching conversations:", error)
      return
    }

    // Get message counts
    const convIds = data?.map(c => c.id) || []
    if (convIds.length > 0) {
      const { data: messageCounts } = await supabase
        .from("support_messages")
        .select("conversation_id")
        .in("conversation_id", convIds)

      const counts: Record<string, number> = {}
      messageCounts?.forEach(m => {
        counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1
      })

      data?.forEach(c => {
        c.message_count = counts[c.id] || 0
      })
    }

    setConversations(data || [])
    setLoading(false)
  }

  const filteredConversations = conversations.filter(c => {
    if (filter === "all") return true
    if (filter === "escalated") return c.status === "escalated"
    if (filter === "active") return c.status === "active"
    if (filter === "resolved") return c.status === "resolved" || c.status === "closed"
    return true
  })

  const escalatedCount = conversations.filter(c => c.status === "escalated").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "escalated":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Escalated</Badge>
      case "active":
        return <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3 w-3" /> Active</Badge>
      case "resolved":
        return <Badge variant="outline" className="gap-1 text-green-500 border-green-500"><CheckCircle className="h-3 w-3" /> Resolved</Badge>
      case "closed":
        return <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" /> Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Conversations</h1>
        <p className="text-muted-foreground">
          Manage customer support chats and escalations
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Conversations</CardDescription>
            <CardTitle className="text-3xl">{conversations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={escalatedCount > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Needs Attention</CardDescription>
            <CardTitle className="text-3xl text-destructive">{escalatedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Chats</CardDescription>
            <CardTitle className="text-3xl">{conversations.filter(c => c.status === "active").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
            <CardTitle className="text-3xl">{conversations.filter(c => c.status === "resolved" || c.status === "closed").length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button 
          variant={filter === "all" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button 
          variant={filter === "escalated" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("escalated")}
          className={escalatedCount > 0 ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" : ""}
        >
          Escalated ({escalatedCount})
        </Button>
        <Button 
          variant={filter === "active" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button 
          variant={filter === "resolved" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("resolved")}
        >
          Resolved
        </Button>
      </div>

      {/* Conversation List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading conversations...</div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/admin/support/${conv.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {conv.visitor_name || "Anonymous"}
                          </span>
                          {getStatusBadge(conv.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {conv.visitor_email && (
                            <span>{conv.visitor_email}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {conv.message_count || 0} messages
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
