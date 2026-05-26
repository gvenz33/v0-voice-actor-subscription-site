import { createAdminClient } from "@/lib/supabase/admin"
import { isAffiliateOwnerEmail } from "@/lib/affiliate-context"

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export type UserProfileRow = {
  id: string
  affiliate_code: string | null
}

/** Ensures a profiles row exists for the auth user (service role, bypasses RLS). */
export async function ensureUserProfile(
  user: AuthUser
): Promise<UserProfileRow> {
  const admin = createAdminClient()

  const { data: existing, error: fetchError } = await admin
    .from("profiles")
    .select("id, affiliate_code")
    .eq("id", user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }
  if (existing) {
    return existing
  }

  const meta = user.user_metadata ?? {}
  const owner = isAffiliateOwnerEmail(user.email)

  const { data: created, error: insertError } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      first_name: (meta.first_name as string | undefined) ?? null,
      last_name: (meta.last_name as string | undefined) ?? null,
      subscription_tier: owner ? "command" : "free",
      is_superadmin: owner,
      is_admin: owner,
    })
    .select("id, affiliate_code")
    .single()

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry, error: retryError } = await admin
        .from("profiles")
        .select("id, affiliate_code")
        .eq("id", user.id)
        .maybeSingle()
      if (retryError) throw new Error(retryError.message)
      if (retry) return retry
    }
    throw new Error(insertError.message)
  }

  return created
}
