"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  AiChatSessionSummary,
  AiChatToolType,
  StoredChatMessage,
} from "@/lib/ai-chat-types"
import { sessionTitleFromMessages } from "@/lib/ai-chat-types"

export type DashboardChatMessage = StoredChatMessage

export type DashboardStreamChatStatus = "ready" | "streaming" | "loading"

function toApiMessages(msgs: DashboardChatMessage[]) {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }))
}


async function fetchSessionById(id: string) {
  const res = await fetch(`/api/ai/sessions/${id}`, { credentials: "include" })
  if (!res.ok) return null
  const data = (await res.json()) as {
    session?: { id: string; messages: StoredChatMessage[]; title: string | null }
  }
  return data.session ?? null
}

async function createSession(tool: AiChatToolType) {
  const res = await fetch("/api/ai/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tool }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { session?: { id: string } }
  return data.session?.id ?? null
}

async function persistSession(
  sessionId: string,
  messages: StoredChatMessage[],
  title?: string,
) {
  await fetch(`/api/ai/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages, title }),
  })
}

/**
 * Streaming chat with Supabase-backed session history.
 */
export function usePersistedDashboardStreamChat(apiPath: string, tool: AiChatToolType) {
  const [messages, setMessages] = useState<DashboardChatMessage[]>([])
  const [status, setStatus] = useState<DashboardStreamChatStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<AiChatSessionSummary[]>([])
  const [historyAvailable, setHistoryAvailable] = useState(true)

  const messagesRef = useRef<DashboardChatMessage[]>([])
  const sessionIdRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const refreshSessions = useCallback(async () => {
    const res = await fetch(`/api/ai/sessions?tool=${tool}`, { credentials: "include" })
    if (!res.ok) {
      if (res.status === 503) setHistoryAvailable(false)
      return
    }
    const data = (await res.json()) as { sessions?: AiChatSessionSummary[] }
    setSessions(data.sessions ?? [])
  }, [tool])

  const loadSession = useCallback(
    async (id: string) => {
      setStatus("loading")
      const session = await fetchSessionById(id)
      if (!session) {
        setStatus("ready")
        return
      }
      setSessionId(session.id)
      setMessages(session.messages ?? [])
      setStatus("ready")
    },
    [],
  )

  const startNewSession = useCallback(async () => {
    if (!historyAvailable) {
      setMessages([])
      setSessionId(null)
      return
    }
    setStatus("loading")
    const id = await createSession(tool)
    if (id) {
      setSessionId(id)
      setMessages([])
      await refreshSessions()
    }
    setStatus("ready")
  }, [historyAvailable, refreshSessions, tool])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setStatus("loading")
      const listRes = await fetch(`/api/ai/sessions?tool=${tool}`, {
        credentials: "include",
      })

      if (!listRes.ok) {
        if (listRes.status === 503) setHistoryAvailable(false)
        if (!cancelled) setStatus("ready")
        return
      }

      const listData = (await listRes.json()) as { sessions?: AiChatSessionSummary[] }
      const list = listData.sessions ?? []
      if (!cancelled) setSessions(list)

      const latest = list[0]
      if (latest) {
        const full = await fetchSessionById(latest.id)
        if (!cancelled && full) {
          setSessionId(full.id)
          setMessages(full.messages ?? [])
          setStatus("ready")
          return
        }
      }

      const newId = await createSession(tool)
      if (!cancelled) {
        setSessionId(newId)
        setMessages([])
        setStatus("ready")
        if (newId) await refreshSessions()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tool, refreshSessions])

  const clearError = useCallback(() => setError(null), [])

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || inFlightRef.current || status === "loading") return
      inFlightRef.current = true

      let activeSessionId = sessionIdRef.current
      if (historyAvailable && !activeSessionId) {
        activeSessionId = await createSession(tool)
        if (activeSessionId) {
          setSessionId(activeSessionId)
          sessionIdRef.current = activeSessionId
        }
      }

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
            /* plain text */
          }
          throw new Error(msg || `Request failed (${res.status})`)
        }

        if (!res.body) throw new Error("Empty response body")

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages((curr) =>
            curr.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          )
        }
        acc += decoder.decode()

        const finalMessages: DashboardChatMessage[] = [
          ...prior,
          userMsg,
          { id: assistantId, role: "assistant", content: acc },
        ]
        setMessages(finalMessages)

        if (historyAvailable && activeSessionId && acc.trim()) {
          const title = sessionTitleFromMessages(finalMessages, "Conversation")
          await persistSession(activeSessionId, finalMessages, title)
          await refreshSessions()
        }

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
    [apiPath, historyAvailable, refreshSessions, status, tool],
  )

  return {
    messages,
    sendText,
    status,
    error,
    clearError,
    isLoading: status === "streaming" || status === "loading",
    sessionId,
    sessions,
    historyAvailable,
    loadSession,
    startNewSession,
    refreshSessions,
  }
}

export async function savePitchSession(params: {
  messages: StoredChatMessage[]
  title?: string
}) {
  const res = await fetch("/api/ai/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tool: "pitch", title: params.title }),
  })
  if (!res.ok) return null

  const data = (await res.json()) as { session?: { id: string } }
  const sessionId = data.session?.id
  if (!sessionId) return null

  await fetch(`/api/ai/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      messages: params.messages,
      title: params.title,
    }),
  })

  return sessionId
}
