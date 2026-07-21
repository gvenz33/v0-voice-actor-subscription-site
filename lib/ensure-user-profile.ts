import { createAdminClient } from "@/lib/supabase/admin"
import { isAffiliateOwnerEmail } from "@/lib/affiliate-context"
import { addTrialDays, FREE_TRIAL_DAYS } from "@/lib/trial"

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export type UserProfileRow = {
  id: string
  affiliate_code: string | null
}

async function hasPromoRedemption(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
  return Boolean(data && data.length > 0)
}

/** Ensures a profiles row exists for the auth user (service role, bypasses RLS). */
export async function ensureUserProfile(
  user: AuthUser
): Promise<UserProfileRow> {
  const admin = createAdminClient()

  const { data: existing, error: fetchError } = await admin
    .from("profiles")
    .select(
      "id, affiliate_code, subscription_tier, trial_started_at, trial_ends_at, trial_exempt, is_admin, is_superadmin, created_at",
    )
    .eq("id", user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const owner = isAffiliateOwnerEmail(user.email)
  const promoUser = await hasPromoRedemption(user.id)

  if (existing) {
    const updates: Record<string, unknown> = {}
    const tier = (existing.subscription_tier || "free") as string

    if (owner) {
      updates.subscription_tier = "command"
      updates.is_superadmin = true
      updates.is_admin = true
      updates.trial_exempt = true
    } else if (promoUser || tier !== "free") {
      updates.trial_exempt = true
    } else if (!existing.trial_exempt && !existing.trial_ends_at) {
      const start = existing.trial_started_at
        ? new Date(existing.trial_started_at)
        : existing.created_at
          ? new Date(existing.created_at)
          : new Date()
      updates.trial_started_at = start.toISOString()
      updates.trial_ends_at = addTrialDays(start, FREE_TRIAL_DAYS).toISOString()
    }

    if (Object.keys(updates).length > 0) {
      await admin.from("profiles").update(updates).eq("id", user.id)
    }

    return { id: existing.id, affiliate_code: existing.affiliate_code }
  }

  const meta = user.user_metadata ?? {}
  const now = new Date()
  const insertPayload: Record<string, unknown> = {
    id: user.id,
    first_name: (meta.first_name as string | undefined) ?? null,
    last_name: (meta.last_name as string | undefined) ?? null,
    subscription_tier: owner ? "command" : "free",
    trial_started_at: now.toISOString(),
    trial_ends_at: addTrialDays(now, FREE_TRIAL_DAYS).toISOString(),
    trial_exempt: owner || promoUser,
  }
  if (owner) {
    insertPayload.is_superadmin = true
    insertPayload.is_admin = true
  }

  const { data: created, error: insertError } = await admin
    .from("profiles")
    .insert(insertPayload)
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
