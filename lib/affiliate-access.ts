import {
  getTierDisplayLabel,
  normalizeSubscriptionTier,
  type SubscriptionTier,
} from "@/lib/subscription-tier"

export type { SubscriptionTier }
export { getTierDisplayLabel, normalizeSubscriptionTier }

export type AffiliateLockReason =
  | "program_disabled"
  | "tier_locked"
  | "override_disabled"

export type FeatureOverridesInput = Record<string, unknown> | string | null | undefined

export function parseFeatureOverrides(
  raw: FeatureOverridesInput
): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return raw as Record<string, unknown>
}

export function resolveAffiliateAccess(params: {
  subscriptionTier: string | null | undefined
  featureOverrides?: FeatureOverridesInput
  programEnabled?: boolean
  /** Superadmins always get affiliate access when the program is enabled. */
  isSuperadmin?: boolean
}) {
  const programEnabled = params.programEnabled !== false
  const tier = normalizeSubscriptionTier(params.subscriptionTier)
  const overrides = parseFeatureOverrides(params.featureOverrides)

  // All plans can join the affiliate program (free accounts earn 8%; paid plans 20%).
  const tierEligible = true
  const affiliateOverride =
    overrides.hasAffiliate === true || overrides.hasAffiliate === "true"
      ? true
      : overrides.hasAffiliate === false || overrides.hasAffiliate === "false"
        ? false
        : null

  const hasExplicitEnable = affiliateOverride === true
  const isDisabled =
    !params.isSuperadmin && affiliateOverride === false
  const tierDefaultAffiliate = tierEligible
  const hasAffiliateAccess =
    hasExplicitEnable || (affiliateOverride !== false && tierDefaultAffiliate)

  const reasons: AffiliateLockReason[] = []

  if (!programEnabled) {
    reasons.push("program_disabled")
  }
  if (isDisabled) {
    reasons.push("override_disabled")
  }
  if (programEnabled && !isDisabled && !hasAffiliateAccess && !params.isSuperadmin) {
    reasons.push("tier_locked")
  }

  const isEligible =
    programEnabled &&
    !isDisabled &&
    (params.isSuperadmin || hasAffiliateAccess)

  return {
    isEligible,
    subscriptionTier: tier,
    tierLabel: getTierDisplayLabel(tier),
    tierEligible,
    hasOverride: hasExplicitEnable,
    isDisabled,
    programEnabled,
    reasons,
  }
}

/** Free accounts earn 8%; Launch / Momentum / Command earn 20%. Admin override supported. */
export const FREE_AFFILIATE_COMMISSION_RATE = 0.08
export const PAID_AFFILIATE_COMMISSION_RATE = 0.2

export function getAffiliateCommissionRate(
  subscriptionTier: string | null | undefined,
  featureOverrides?: FeatureOverridesInput
): number {
  const overrides = parseFeatureOverrides(featureOverrides)
  const raw = overrides.affiliateCommissionRate
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0 && raw <= 1) {
    return raw
  }
  if (typeof raw === "string") {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0 && n <= 1) return n
    // Allow "8" or "8%" style admin entry as percent points
    if (Number.isFinite(n) && n > 1 && n <= 100) return n / 100
  }

  const tier = normalizeSubscriptionTier(subscriptionTier)
  return tier === "free" ? FREE_AFFILIATE_COMMISSION_RATE : PAID_AFFILIATE_COMMISSION_RATE
}

export function formatAffiliateCommissionPercent(rate: number): string {
  const pct = Math.round(rate * 1000) / 10
  return Number.isInteger(pct) ? `${pct}%` : `${pct}%`
}
