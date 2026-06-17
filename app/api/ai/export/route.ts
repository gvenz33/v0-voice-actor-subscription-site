import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  conversationExportFilename,
  generateConversationDocxBuffer,
  generateConversationPdfBuffer,
  type ExportMessage,
} from "@/lib/conversation-export"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as {
    format?: "pdf" | "docx"
    title?: string
    toolLabel?: string
    messages?: ExportMessage[]
    sessionId?: string
  }

  const format = body.format === "docx" ? "docx" : "pdf"
  let messages = body.messages
  let title = body.title?.trim() || "VO Biz Suite Conversation"
  let toolLabel = body.toolLabel?.trim() || "AI Tools"

  if (body.sessionId) {
    const { data: session } = await supabase
      .from("ai_chat_sessions")
      .select("title, tool_type, messages")
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    messages = (session.messages ?? []) as ExportMessage[]
    if (session.title) title = session.title
    const toolNames: Record<string, string> = {
      coach: "VO Career Coach",
      assistant: "VO Business Assistant",
      pitch: "Elevator Pitch",
    }
    toolLabel = toolNames[session.tool_type] ?? toolLabel
  }

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages to export" }, { status: 400 })
  }

  const filtered = messages.filter((m) => m.content?.trim())
  if (!filtered.length) {
    return NextResponse.json({ error: "No messages to export" }, { status: 400 })
  }

  const params = { title, toolLabel, messages: filtered }
  const buffer =
    format === "docx"
      ? await generateConversationDocxBuffer(params)
      : await generateConversationPdfBuffer(params)

  const filename = conversationExportFilename(title, format)
  const contentType =
    format === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf"

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
