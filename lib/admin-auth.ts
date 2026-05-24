import { createClient } from "@/lib/supabase/server"

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const }
  }

  const isSuperadminEmail = user.email === "gvenz33@gmail.com"

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin && !profile?.is_superadmin && !isSuperadminEmail) {
    return { supabase, user, error: "Forbidden" as const }
  }

  return { supabase, user, error: null }
}
