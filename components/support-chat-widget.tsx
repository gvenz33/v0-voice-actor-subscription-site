"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, User, Bot, Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant" | "admin"
  content: string
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string>("")
  const [visitorName, setVisitorName] = useState("")
  const [visitorEmail, setVisitorEmail] = useState("")
  const [showIntro, setShowIntro] = useState(true)
  const [isEscalated, setIsEscalated] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate visitor ID on mount
  useEffect(() => {
    const stored = localStorage.getItem("vob_visitor_id")
    if (stored) {
      setVisitorId(stored)
    } else {
      const newId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("vob_visitor_id", newId)
      setVisitorId(newId)
    }

    // Load conversation from storage
    const storedConv = localStorage.getItem("vob_support_conversation")
    if (storedConv) {
      try {
        const data = JSON.parse(storedConv)
        setConversationId(data.conversationId)
        setMessages(data.messages || [])
        setVisitorName(data.visitorName || "")
        setVisitorEmail(data.visitorEmail || "")
        setShowIntro(false)
        setIsEscalated(data.isEscalated || false)
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save conversation to storage
  useEffect(() => {
    if (conversationId || messages.length > 0) {
      localStorage.setItem("vob_support_conversation", JSON.stringify({
        conversationId,
        messages,
        visitorName,
        visitorEmail,
        isEscalated
      }))
    }
  }, [conversationId, messages, visitorName, visitorEmail, isEscalated])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !showIntro && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, showIntro])

  const startConversation = () => {
    if (!visitorName.trim()) return
    setShowIntro(false)
    setMessages([{
      role: "assistant",
      content: `Hi ${visitorName}! I'm VOBizSuite's AI support assistant. How can I help you today? I can answer questions about our features, subscription plans, troubleshooting, and more.`
    }])
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          conversationId,
          visitorId,
          visitorName,
          visitorEmail
        })
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.message }])

    } catch (err) {
      console.error("Chat error:", err)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble responding right now. Please try again or email us at hello@vobizsuite.io" 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const requestEscalation = async () => {
    if (!conversationId || isEscalated) return
    
    setIsLoading(true)
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          visitorId,
          visitorName,
          visitorEmail,
          requestEscalation: true,
          messages: []
        })
      })

      const data = await res.json()
      
      if (data.escalated) {
        setIsEscalated(true)
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message 
        }])
      }
    } catch (err) {
      console.error("Escalation error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setConversationId(null)
    setShowIntro(true)
    setIsEscalated(false)
    localStorage.removeItem("vob_support_conversation")
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl",
          isOpen && "hidden"
        )}
        aria-label="Open support chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">Support</h3>
                <p className="text-xs text-primary-foreground/70">
                  {isEscalated ? "Human agent notified" : "AI-powered assistance"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="h-8 px-2 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Intro Form */}
          {showIntro ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-foreground">Welcome to Support</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us a bit about yourself to get started
                </p>
              </div>
              <div className="w-full space-y-3">
                <Input
                  placeholder="Your name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="bg-background"
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="bg-background"
                />
                <Button 
                  className="w-full" 
                  onClick={startConversation}
                  disabled={!visitorName.trim()}
                >
                  Start Conversation
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
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
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Escalation Button */}
              {!isEscalated && messages.length > 2 && (
                <div className="border-t border-border px-4 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestEscalation}
                    disabled={isLoading}
                    className="w-full text-xs"
                  >
                    <UserPlus className="mr-2 h-3 w-3" />
                    Talk to a Human
                  </Button>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-border p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-background"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
