import type { SupabaseClient } from "@supabase/supabase-js"
import { resolveAffiliateAccess } from "@/lib/affiliate-access"
import { isAffiliateProgramEnabled } from "@/lib/system-settings"

export async function getAffiliateAccessForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const programEnabled = await isAffiliateProgramEnabled()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier, feature_overrides")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    return {
      access: resolveAffiliateAccess({
        subscriptionTier: "free",
        programEnabled,
      }),
      error: error?.message ?? "Profile not found",
    }
  }

  const access = resolveAffiliateAccess({
    subscriptionTier: profile.subscription_tier,
    featureOverrides: profile.feature_overrides,
    programEnabled,
  })

  return { access, error: null }
}

export async function requireAffiliateEligible(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { access, error } = await getAffiliateAccessForUser(supabase, userId)

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
    if (access.isDisabled) {
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
