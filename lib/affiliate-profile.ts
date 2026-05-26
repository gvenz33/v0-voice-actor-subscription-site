import type { SupabaseClient } from "@supabase/supabase-js"
import { isAffiliateOwnerEmail } from "@/lib/affiliate-context"
import { ensureUserProfile, type UserProfileRow } from "@/lib/ensure-user-profile"
import { generateAffiliateCode } from "@/lib/affiliate-code"

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export type { UserProfileRow }

/** Load or create the caller's profile using their session (no service role required). */
export async function getOrCreateAffiliateProfile(
  supabase: SupabaseClient,
  user: AuthUser
): Promise<UserProfileRow> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, affiliate_code")
    .eq("id", user.id)
    .maybeSingle()

  if (existing) {
    return existing
  }

  if (selectError) {
    console.error("[affiliate-profile] select", selectError)
  }

  const meta = user.user_metadata ?? {}
  const owner = isAffiliateOwnerEmail(user.email)

  const insertPayload: Record<string, unknown> = {
    id: user.id,
    first_name: (meta.first_name as string | undefined) ?? null,
    last_name: (meta.last_name as string | undefined) ?? null,
  }
  if (owner) {
    insertPayload.subscription_tier = "command"
    insertPayload.is_superadmin = true
    insertPayload.is_admin = true
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select("id, affiliate_code")
    .maybeSingle()

  if (created) {
    return created
  }

  if (insertError) {
    console.error("[affiliate-profile] insert", insertError)

    const { data: retry } = await supabase
      .from("profiles")
      .select("id, affiliate_code")
      .eq("id", user.id)
      .maybeSingle()

    if (retry) {
      return retry
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        return await ensureUserProfile(user)
      } catch (adminError) {
        console.error("[affiliate-profile] admin fallback", adminError)
      }
    }

    const detail = insertError.message?.trim()
    throw new Error(
      detail
        ? `Unable to set up your profile: ${detail}`
        : "Unable to set up your profile. Please try again or contact support."
    )
  }

  throw new Error("Profile not found")
}

export async function countAffiliateReferrals(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("affiliate_referrals")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_user_id", userId)

  if (error) {
    console.error("[affiliate-profile] referral count", error)
    return 0
  }
  return count ?? 0
}

/** Assign a random VOB code; retries on unique constraint collisions. */
export async function assignGeneratedAffiliateCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateAffiliateCode()
    const { data, error } = await supabase
      .from("profiles")
      .update({
        affiliate_code: code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("affiliate_code")
      .single()

    if (!error && data?.affiliate_code) {
      return data.affiliate_code
    }
    if (error?.code === "23505") {
      continue
    }
    if (error) {
      throw new Error(error.message)
    }
  }
  throw new Error("Could not generate a unique affiliate code")
}

export async function saveAffiliateCode(
  supabase: SupabaseClient,
  userId: string,
  code: string
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      affiliate_code: code,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("affiliate_code")
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("CODE_TAKEN")
    }
    throw new Error(error.message)
  }

  return data?.affiliate_code ?? code
}
