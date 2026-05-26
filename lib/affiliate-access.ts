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

  const tierEligible = tier === "momentum" || tier === "command"
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
