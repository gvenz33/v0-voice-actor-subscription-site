import { createClient } from "@/lib/supabase/server"

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
      isSuperadmin: false,
      error: "Unauthorized" as const,
    }
  }

  const isSuperadminEmail = user.email === "gvenz33@gmail.com"

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("id", user.id)
    .single()

  const isSuperadmin = Boolean(profile?.is_superadmin || isSuperadminEmail)

  if (!profile?.is_admin && !isSuperadmin) {
    return {
      supabase,
      user,
      profile,
      isSuperadmin: false,
      error: "Forbidden" as const,
    }
  }

  return { supabase, user, profile, isSuperadmin, error: null }
}
