import type { SubscriptionTier } from "@/lib/ai-limits"
import { TIER_LIMITS } from "@/lib/ai-limits"

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
}) {
  const programEnabled = params.programEnabled !== false
  const tier = (params.subscriptionTier || "free") as SubscriptionTier
  const overrides = parseFeatureOverrides(params.featureOverrides)

  const tierEligible = tier === "momentum" || tier === "command"
  const hasOverride = overrides.hasAffiliate === true
  const isDisabled = overrides.hasAffiliate === false

  const reasons: AffiliateLockReason[] = []

  if (!programEnabled) {
    reasons.push("program_disabled")
  }
  if (isDisabled) {
    reasons.push("override_disabled")
  }
  if (programEnabled && !isDisabled && !tierEligible && !hasOverride) {
    reasons.push("tier_locked")
  }

  const isEligible =
    programEnabled && (tierEligible || hasOverride) && !isDisabled

  const tierLabel = TIER_LIMITS[tier]?.label ?? tier

  return {
    isEligible,
    subscriptionTier: tier,
    tierLabel,
    tierEligible,
    hasOverride,
    isDisabled,
    programEnabled,
    reasons,
  }
}
