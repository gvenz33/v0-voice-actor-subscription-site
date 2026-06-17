"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadBlob } from "@/lib/download-blob"
import type { AiChatSessionSummary, StoredChatMessage } from "@/lib/ai-chat-types"
import {
  Download,
  FileText,
  History,
  Loader2,
  MessageSquarePlus,
} from "lucide-react"

type AiChatToolbarProps = {
  title: string
  toolLabel: string
  messages: StoredChatMessage[]
  sessionId?: string | null
  sessions?: AiChatSessionSummary[]
  historyAvailable?: boolean
  onNewChat?: () => void
  onLoadSession?: (id: string) => void
  disabled?: boolean
}

export function AiChatToolbar({
  title,
  toolLabel,
  messages,
  sessionId,
  sessions = [],
  historyAvailable = true,
  onNewChat,
  onLoadSession,
  disabled,
}: AiChatToolbarProps) {
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null)

  const hasExportable = messages.some((m) => m.content.trim())

  const handleExport = async (format: "pdf" | "docx") => {
    if (!hasExportable) return
    setExporting(format)
    try {
      const res = await fetch("/api/ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          format,
          title,
          toolLabel,
          messages: messages.filter((m) => m.content.trim()),
          sessionId: sessionId ?? undefined,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 200) || "Export failed")
      }
      const blob = await res.blob()
      const ext = format === "docx" ? "docx" : "pdf"
      const safe = title.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 50) || "conversation"
      downloadBlob(blob, `${safe}.${ext}`)
    } catch (err) {
      console.error("[AiChatToolbar] export failed:", err)
      alert(err instanceof Error ? err.message : "Export failed")
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {historyAvailable && onNewChat && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onNewChat}
          disabled={disabled}
        >
          <MessageSquarePlus className="size-3.5" />
          New chat
        </Button>
      )}

      {historyAvailable && sessions.length > 0 && onLoadSession && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
              <History className="size-3.5" />
              History
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
            <DropdownMenuLabel>Previous conversations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onLoadSession(session.id)}
                className={session.id === sessionId ? "bg-muted" : undefined}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-sm">
                    {session.title || "Conversation"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {hasExportable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={disabled || exporting !== null}
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => void handleExport("pdf")}>
              <FileText className="mr-2 size-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExport("docx")}>
              <FileText className="mr-2 size-4" />
              Download Word (.docx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function PitchExportButtons({
  title,
  messages,
  disabled,
}: {
  title: string
  messages: StoredChatMessage[]
  disabled?: boolean
}) {
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null)
  if (!messages.some((m) => m.content.trim())) return null

  const handleExport = async (format: "pdf" | "docx") => {
    setExporting(format)
    try {
      const res = await fetch("/api/ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          format,
          title,
          toolLabel: "Elevator Pitch",
          messages,
        }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const ext = format === "docx" ? "docx" : "pdf"
      downloadBlob(blob, `elevator-pitch.${ext}`)
    } catch {
      alert("Could not export pitch. Please try again.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled || exporting !== null}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleExport("pdf")}>PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleExport("docx")}>Word (.docx)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
