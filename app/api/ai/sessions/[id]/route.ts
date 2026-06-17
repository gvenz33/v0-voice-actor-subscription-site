import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { StoredChatMessage } from "@/lib/ai-chat-types"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .select("id, tool_type, title, messages, updated_at, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ session: data })
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as {
    messages?: StoredChatMessage[]
    title?: string
  }

  const updates: Record<string, unknown> = {}
  if (Array.isArray(body.messages)) {
    updates.messages = body.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }))
  }
  if (typeof body.title === "string") {
    updates.title = body.title.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, tool_type, title, messages, updated_at, created_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ session: data })
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { error } = await supabase
    .from("ai_chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
