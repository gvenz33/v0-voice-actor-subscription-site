import {
  getTierDisplayLabel,
  normalizeSubscriptionTier,
  type SubscriptionTier,
} from "@/lib/subscription-tier"
import {
  parseFeatureOverrides,
  resolveAffiliateAccess,
  type AffiliateLockReason,
  type FeatureOverridesInput,
} from "@/lib/affiliate-access"

/** Accounts that always receive Command-tier affiliate access when the program is enabled. */
export const AFFILIATE_OWNER_EMAILS = ["gvenz33@gmail.com"] as const

export function isAffiliateOwnerEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? ""
  return AFFILIATE_OWNER_EMAILS.some((e) => e === normalized)
}

export function getEffectiveSubscriptionTier(
  raw: string | null | undefined,
  userEmail?: string | null,
  isSuperadmin?: boolean
): SubscriptionTier {
  const tier = normalizeSubscriptionTier(raw)
  if (
    tier === "free" &&
    (isSuperadmin || isAffiliateOwnerEmail(userEmail))
  ) {
    return "command"
  }
  return tier
}

export type AffiliateContext = {
  subscriptionTier: SubscriptionTier
  tierLabel: string
  isEligible: boolean
  lockReasons: AffiliateLockReason[]
  programEnabled: boolean
  isSuperadmin: boolean
}

export function resolveAffiliateContext(params: {
  userEmail?: string | null
  subscriptionTier?: string | null | undefined
  featureOverrides?: FeatureOverridesInput
  programEnabled?: boolean
  isSuperadmin?: boolean
}): AffiliateContext {
  const isSuperadmin =
    Boolean(params.isSuperadmin) || isAffiliateOwnerEmail(params.userEmail)

  const effectiveTier = getEffectiveSubscriptionTier(
    params.subscriptionTier,
    params.userEmail,
    isSuperadmin
  )

  const programEnabled = params.programEnabled !== false

  const access = resolveAffiliateAccess({
    subscriptionTier: effectiveTier,
    featureOverrides: params.featureOverrides,
    programEnabled,
    isSuperadmin,
  })

  if (isSuperadmin && programEnabled) {
    return {
      subscriptionTier: effectiveTier,
      tierLabel: getTierDisplayLabel(effectiveTier),
      isEligible: true,
      lockReasons: access.reasons.filter(
        (r) => r !== "tier_locked" && r !== "override_disabled"
      ),
      programEnabled,
      isSuperadmin: true,
    }
  }

  return {
    subscriptionTier: access.subscriptionTier,
    tierLabel: access.tierLabel,
    isEligible: access.isEligible,
    lockReasons: access.reasons,
    programEnabled: access.programEnabled,
    isSuperadmin,
  }
}
