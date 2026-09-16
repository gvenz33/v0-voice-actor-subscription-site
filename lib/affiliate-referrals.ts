import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeAffiliateCodeInput } from "@/lib/affiliate-code"
import {
  getAffiliateCommissionRate,
  type FeatureOverridesInput,
} from "@/lib/affiliate-access"

export type AffiliateReferralRow = {
  id: string
  affiliate_user_id: string
  referred_user_id: string
  affiliate_code: string
  status: string
  commission_rate: number
  total_earned: number
}

/** Resolve a referral code to an affiliate profile (not the referred user). */
export async function findAffiliateByCode(
  admin: SupabaseClient,
  rawCode: string
): Promise<{
  id: string
  affiliate_code: string
  subscription_tier: string | null
  feature_overrides: FeatureOverridesInput
} | null> {
  const code = normalizeAffiliateCodeInput(rawCode)
  if (!code) return null

  const { data, error } = await admin
    .from("profiles")
    .select("id, affiliate_code, subscription_tier, feature_overrides")
    .eq("affiliate_code", code)
    .maybeSingle()

  if (error || !data?.id || !data.affiliate_code) return null
  return {
    id: data.id,
    affiliate_code: data.affiliate_code,
    subscription_tier: data.subscription_tier ?? null,
    feature_overrides: data.feature_overrides as FeatureOverridesInput,
  }
}

/**
 * Persist profiles.referred_by and create a pending affiliate_referrals row.
 * Safe to call multiple times (idempotent on referred_user_id uniqueness).
 */
export async function attributeReferralForUser(params: {
  referredUserId: string
  referralCode: string | null | undefined
}): Promise<{ ok: true; referralId: string | null } | { ok: false; error: string }> {
  const code = params.referralCode
    ? normalizeAffiliateCodeInput(params.referralCode)
    : ""
  if (!code) return { ok: true, referralId: null }

  const admin = createAdminClient()
  const affiliate = await findAffiliateByCode(admin, code)
  if (!affiliate) {
    return { ok: false, error: "Invalid referral code" }
  }
  if (affiliate.id === params.referredUserId) {
    return { ok: false, error: "Cannot refer yourself" }
  }

  await admin
    .from("profiles")
    .update({
      referred_by: affiliate.affiliate_code,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.referredUserId)

  const { data: existing } = await admin
    .from("affiliate_referrals")
    .select("id")
    .eq("referred_user_id", params.referredUserId)
    .maybeSingle()

  if (existing?.id) {
    return { ok: true, referralId: existing.id }
  }

  const rate = getAffiliateCommissionRate(
    affiliate.subscription_tier,
    affiliate.feature_overrides
  )

  const { data: inserted, error } = await admin
    .from("affiliate_referrals")
    .insert({
      affiliate_user_id: affiliate.id,
      referred_user_id: params.referredUserId,
      affiliate_code: affiliate.affiliate_code,
      status: "pending",
      commission_rate: rate,
      total_earned: 0,
    })
    .select("id")
    .maybeSingle()

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("affiliate_referrals")
        .select("id")
        .eq("referred_user_id", params.referredUserId)
        .maybeSingle()
      return { ok: true, referralId: again?.id ?? null }
    }
    console.error("[affiliate] create referral failed:", error)
    return { ok: false, error: error.message }
  }

  return { ok: true, referralId: inserted?.id ?? null }
}

export async function activateAffiliateReferral(referredUserId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from("affiliate_referrals")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("referred_user_id", referredUserId)
    .in("status", ["pending", "active"])

  if (error) {
    console.error("[affiliate] activate referral failed:", error)
  }
}

/**
 * Accrue commission for a Stripe subscription invoice payment.
 * Idempotent via affiliate_commission_events.stripe_invoice_id when available.
 */
export async function accrueAffiliateCommission(params: {
  referredUserId: string
  amountPaidCents: number
  stripeInvoiceId?: string | null
  stripeEventId?: string | null
}): Promise<{ accrued: number } | { accrued: 0; skipped: string }> {
  if (!params.referredUserId || !Number.isFinite(params.amountPaidCents) || params.amountPaidCents <= 0) {
    return { accrued: 0, skipped: "invalid_amount" }
  }

  const admin = createAdminClient()

  if (params.stripeInvoiceId) {
    const { data: prior } = await admin
      .from("affiliate_commission_events")
      .select("id")
      .eq("stripe_invoice_id", params.stripeInvoiceId)
      .maybeSingle()
    if (prior?.id) {
      return { accrued: 0, skipped: "already_recorded" }
    }
  }

  const { data: referral } = await admin
    .from("affiliate_referrals")
    .select("id, affiliate_user_id, commission_rate, total_earned, status")
    .eq("referred_user_id", params.referredUserId)
    .maybeSingle()

  if (!referral) {
    return { accrued: 0, skipped: "no_referral" }
  }

  const rate = Number(referral.commission_rate) || 0
  if (rate <= 0) {
    return { accrued: 0, skipped: "zero_rate" }
  }

  const commission = Number(((params.amountPaidCents / 100) * rate).toFixed(2))
  if (commission <= 0) {
    return { accrued: 0, skipped: "zero_commission" }
  }

  const nextTotal = Number((Number(referral.total_earned || 0) + commission).toFixed(2))

  const { error: updateError } = await admin
    .from("affiliate_referrals")
    .update({
      status: "active",
      total_earned: nextTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referral.id)

  if (updateError) {
    console.error("[affiliate] commission update failed:", updateError)
    return { accrued: 0, skipped: updateError.message }
  }

  // Best-effort ledger; table may not exist until SQL script is applied.
  try {
    await admin.from("affiliate_commission_events").insert({
      referral_id: referral.id,
      affiliate_user_id: referral.affiliate_user_id,
      referred_user_id: params.referredUserId,
      amount: commission,
      stripe_invoice_id: params.stripeInvoiceId ?? null,
      stripe_event_id: params.stripeEventId ?? null,
    })
  } catch (err) {
    console.warn("[affiliate] commission event insert skipped:", err)
  }

  return { accrued: commission }
}

/** Resolve referred user id from Stripe customer / metadata. */
export async function resolveReferredUserIdFromStripe(params: {
  userId?: string | null
  stripeCustomerId?: string | null
}): Promise<string | null> {
  if (params.userId) return params.userId
  if (!params.stripeCustomerId) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", params.stripeCustomerId)
    .maybeSingle()

  return data?.id ?? null
}
