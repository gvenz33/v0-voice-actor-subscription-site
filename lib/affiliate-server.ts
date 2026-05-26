import type { SupabaseClient } from "@supabase/supabase-js"
import {
  isAffiliateOwnerEmail,
  resolveAffiliateContext,
} from "@/lib/affiliate-context"
import { isAffiliateProgramEnabled } from "@/lib/system-settings"

export async function getAffiliateAccessForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null
) {
  const programEnabled = await isAffiliateProgramEnabled()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier, feature_overrides, is_superadmin")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    const ctx = resolveAffiliateContext({
      userEmail,
      subscriptionTier: "free",
      programEnabled,
      isSuperadmin: isAffiliateOwnerEmail(userEmail),
    })
    return { access: ctx, error: error?.message ?? "Profile not found" }
  }

  const ctx = resolveAffiliateContext({
    userEmail,
    subscriptionTier: profile.subscription_tier,
    featureOverrides: profile.feature_overrides,
    programEnabled,
    isSuperadmin: Boolean(profile.is_superadmin),
  })

  return { access: ctx, error: null }
}

export async function requireAffiliateEligible(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { access, error } = await getAffiliateAccessForUser(
    supabase,
    userId,
    userEmail
  )

  if (error) {
    return { ok: false, status: 500, error }
  }

  if (!access.isEligible) {
    if (!access.programEnabled) {
      return {
        ok: false,
        status: 403,
        error: "The affiliate program is temporarily disabled.",
      }
    }
    if (access.lockReasons.includes("override_disabled")) {
      return {
        ok: false,
        status: 403,
        error: "Affiliate access is disabled for your account.",
      }
    }
    return {
      ok: false,
      status: 403,
      error: "Affiliate program requires Momentum or Command subscription.",
    }
  }

  return { ok: true }
}
