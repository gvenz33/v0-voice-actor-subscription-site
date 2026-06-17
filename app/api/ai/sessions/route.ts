import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { AiChatToolType } from "@/lib/ai-chat-types"

const VALID_TOOLS: AiChatToolType[] = ["coach", "assistant", "pitch"]

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tool = searchParams.get("tool") as AiChatToolType | null

  if (!tool || !VALID_TOOLS.includes(tool)) {
    return NextResponse.json({ error: "Valid tool query param required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .select("id, tool_type, title, updated_at, created_at")
    .eq("user_id", user.id)
    .eq("tool_type", tool)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Chat history table not set up. Run scripts/create-ai-chat-sessions.sql in Supabase." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as { tool?: AiChatToolType; title?: string }
  const tool = body.tool

  if (!tool || !VALID_TOOLS.includes(tool)) {
    return NextResponse.json({ error: "Valid tool is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .insert({
      user_id: user.id,
      tool_type: tool,
      title: body.title?.trim() || null,
      messages: [],
    })
    .select("id, tool_type, title, messages, updated_at, created_at")
    .single()

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Chat history table not set up. Run scripts/create-ai-chat-sessions.sql in Supabase." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
