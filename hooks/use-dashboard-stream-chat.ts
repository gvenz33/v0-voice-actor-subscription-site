"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type DashboardChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

function toApiMessages(msgs: DashboardChatMessage[]) {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }))
}

export type DashboardStreamChatStatus = "ready" | "streaming"

/**
 * Minimal chat client: POST JSON { messages } and read a text/plain streaming body.
 * Avoids useChat + SSE/UI-message parsing issues in some browsers and dev setups.
 */
export function useDashboardStreamChat(apiPath: string) {
  const [messages, setMessages] = useState<DashboardChatMessage[]>([])
  const [status, setStatus] = useState<DashboardStreamChatStatus>("ready")
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<DashboardChatMessage[]>([])
  const inFlightRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const clearError = useCallback(() => setError(null), [])

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || inFlightRef.current) return
      inFlightRef.current = true

      const userId = crypto.randomUUID()
      const assistantId = crypto.randomUUID()
      const userMsg: DashboardChatMessage = {
        id: userId,
        role: "user",
        content: trimmed,
      }

      const prior = messagesRef.current
      const historyForApi = [...prior, userMsg]

      setError(null)
      setStatus("streaming")
      setMessages([
        ...prior,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ])

      try {
        const res = await fetch(apiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ messages: toApiMessages(historyForApi) }),
        })

        if (!res.ok) {
          const raw = await res.text()
          let msg = raw.slice(0, 500)
          try {
            const j = JSON.parse(raw) as { error?: string }
            if (typeof j.error === "string") msg = j.error
          } catch {
            /* plain text or HTML */
          }
          throw new Error(msg || `Request failed (${res.status})`)
        }

        if (!res.body) {
          throw new Error("Empty response body")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages((curr) =>
            curr.map((m) =>
              m.id === assistantId ? { ...m, content: acc } : m,
            ),
          )
        }
        acc += decoder.decode()
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantId ? { ...m, content: acc } : m,
          ),
        )

        setStatus("ready")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setMessages((curr) => curr.filter((m) => m.id !== assistantId))
        setStatus("ready")
      } finally {
        inFlightRef.current = false
      }
    },
    [apiPath],
  )

  return {
    messages,
    sendText,
    status,
    error,
    clearError,
    isLoading: status === "streaming",
  }
}
