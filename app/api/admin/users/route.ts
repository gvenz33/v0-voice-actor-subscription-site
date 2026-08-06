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

  // Beta feedback participation for admin toggles
  const userIds = users.map((u) => u.id)
  const enrollmentByUser = new Map<
    string,
    { beta: boolean; blumvox: boolean }
  >()
  if (userIds.length) {
    const { data: enrollments } = await admin
      .from("beta_enrollments")
      .select("user_id, promo_code, participation_enabled")
      .in("user_id", userIds)
      .in("promo_code", ["BETA", "BLUMVOX"])

    for (const row of enrollments ?? []) {
      const current = enrollmentByUser.get(row.user_id) ?? { beta: false, blumvox: false }
      const enabled = row.participation_enabled !== false
      if (row.promo_code === "BETA") current.beta = enabled
      if (row.promo_code === "BLUMVOX") current.blumvox = enabled
      enrollmentByUser.set(row.user_id, current)
    }
  }

  const usersWithBeta = users.map((u) => {
    const flags = enrollmentByUser.get(u.id) ?? { beta: false, blumvox: false }
    return {
      ...u,
      beta_feedback_enabled: flags.beta,
      blumvox_feedback_enabled: flags.blumvox,
    }
  })

  return NextResponse.json({ users: usersWithBeta })
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
