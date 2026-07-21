import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Service role bypasses RLS so admins always see every profile.
  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const emailById = new Map<string, string>()
  try {
    let page = 1
    const perPage = 200
    for (let i = 0; i < 20; i++) {
      const { data, error: listError } = await admin.auth.admin.listUsers({
        page,
        perPage,
      })
      if (listError) throw listError
      for (const authUser of data.users) {
        if (authUser.email) emailById.set(authUser.id, authUser.email)
      }
      if (data.users.length < perPage) break
      page += 1
    }
  } catch (listErr) {
    console.error("Failed to load auth emails for admin users list:", listErr)
  }

  const users = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
  }))

  return NextResponse.json({ users })
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { userId, updates } = body

  if (!userId || !updates) {
    return NextResponse.json({ error: "Missing userId or updates" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update(updates).eq("id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
