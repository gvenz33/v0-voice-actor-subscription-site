import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { user, isSuperadmin, error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: userId } = await context.params
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 })
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account from the admin console." },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: targetProfile, error: profileError } = await admin
    .from("profiles")
    .select("id, is_admin, is_superadmin, first_name, last_name")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!targetProfile) {
    // Still try auth delete in case of orphan auth user
    const { error: deleteOrphanError } = await admin.auth.admin.deleteUser(userId)
    if (deleteOrphanError) {
      return NextResponse.json({ error: deleteOrphanError.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  if (targetProfile.is_superadmin && !isSuperadmin) {
    return NextResponse.json(
      { error: "Only a superadmin can delete another superadmin." },
      { status: 403 },
    )
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  if (authUser.user?.email === "gvenz33@gmail.com") {
    return NextResponse.json(
      { error: "The primary superadmin account cannot be deleted." },
      { status: 403 },
    )
  }

  // Deleting the auth user cascades to profiles and related user data.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
