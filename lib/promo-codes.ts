import type { BillingInterval, Product } from "@/lib/products"

export type PromoDiscountType = "percent" | "fixed"
export type BillingIntervalRestriction = "month" | "year" | "quarter" | "any"
export type SubscriptionTierId = Product["tier"]

export const PAID_TIER_IDS: SubscriptionTierId[] = ["launch", "momentum", "command"]

export const TIER_MARKETING_NAMES: Record<SubscriptionTierId, string> = {
  launch: "Launch",
  momentum: "Pro (Momentum)",
  command: "Enterprise (Command)",
}

export const BLUMVOX_PROMO_CODE = "BLUMVOX"

export const BETA_DISCLAIMER =
  "As a BlumVox / BVS beta participant, you agree to active beta participation: complete one short monthly feedback form during the first three months (thoughtful, usable responses). After three months, students who completed all three months keep the discounted rate month-to-month. Students who did not participate can continue at the regular monthly rate. Promo applies to Momentum and Command plans on monthly or 3-month prepay billing."

export interface PromoCodeRecord {
  id: string
  code: string
  description: string | null
  discount_type: PromoDiscountType
  discount_value: number
  applies_to_tiers: string[]
  billing_interval_restriction: BillingIntervalRestriction
  requires_feedback_acknowledgement: boolean
  max_redemptions: number | null
  redemption_count: number
  valid_from: string
  valid_until: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface PromoValidationResult {
  valid: boolean
  error?: string
  promo?: PromoCodeRecord
  originalPriceInCents?: number
  discountedPriceInCents?: number
  discountAppliedCents?: number
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase()
}

export function appliesToTier(promo: PromoCodeRecord, tier: SubscriptionTierId): boolean {
  if (!promo.applies_to_tiers.length) {
    return PAID_TIER_IDS.includes(tier)
  }
  return promo.applies_to_tiers.includes(tier)
}

export function isPromoWithinDateWindow(promo: PromoCodeRecord, now = new Date()): boolean {
  const startsAt = new Date(promo.valid_from)
  if (startsAt > now) return false
  if (promo.valid_until) {
    const endsAt = new Date(promo.valid_until)
    if (endsAt < now) return false
  }
  return true
}

export function hasPromoRedemptionsRemaining(promo: PromoCodeRecord): boolean {
  if (promo.max_redemptions == null) return true
  return promo.redemption_count < promo.max_redemptions
}

export function calculateDiscountedPrice(
  priceInCents: number,
  promo: Pick<PromoCodeRecord, "discount_type" | "discount_value">
): { discountedPriceInCents: number; discountAppliedCents: number } {
  let discountAppliedCents = 0

  if (promo.discount_type === "percent") {
    discountAppliedCents = Math.round(priceInCents * (promo.discount_value / 100))
  } else {
    discountAppliedCents = Math.round(promo.discount_value)
  }

  discountAppliedCents = Math.min(discountAppliedCents, priceInCents)
  const discountedPriceInCents = Math.max(priceInCents - discountAppliedCents, 50)

  return { discountedPriceInCents, discountAppliedCents }
}

export function validatePromoForCheckout(
  promo: PromoCodeRecord,
  tier: SubscriptionTierId,
  interval: BillingInterval,
  priceInCents: number,
  now = new Date()
): PromoValidationResult {
  if (!promo.active) {
    return { valid: false, error: "This promo code is no longer active." }
  }

  if (!isPromoWithinDateWindow(promo, now)) {
    return { valid: false, error: "This promo code is not valid at this time." }
  }

  if (!hasPromoRedemptionsRemaining(promo)) {
    return { valid: false, error: "This promo code has reached its redemption limit." }
  }

  if (!appliesToTier(promo, tier)) {
    const tierNames = promo.applies_to_tiers.length
      ? promo.applies_to_tiers.map((t) => TIER_MARKETING_NAMES[t as SubscriptionTierId] ?? t).join(", ")
      : "selected plans"
    return { valid: false, error: `This promo code only applies to: ${tierNames}.` }
  }

  if (
    promo.billing_interval_restriction !== "any" &&
    promo.billing_interval_restriction !== interval
  ) {
    const msg =
      promo.billing_interval_restriction === "year"
        ? "This promo code is only valid on annual subscriptions."
        : promo.billing_interval_restriction === "quarter"
          ? "This promo code is only valid on 3-month prepay subscriptions."
          : "This promo code is only valid on monthly subscriptions."
    return { valid: false, error: msg }
  }

  // BlumVox students: monthly or 3-month prepay only (not annual)
  if (normalizePromoCode(promo.code) === BLUMVOX_PROMO_CODE && interval === "year") {
    return {
      valid: false,
      error: "BLUMVOX applies to monthly or 3-month prepay plans — not annual billing.",
    }
  }

  const { discountedPriceInCents, discountAppliedCents } = calculateDiscountedPrice(
    priceInCents,
    promo
  )

  return {
    valid: true,
    promo,
    originalPriceInCents: priceInCents,
    discountedPriceInCents,
    discountAppliedCents,
  }
}

export function formatPromoDiscount(promo: Pick<PromoCodeRecord, "discount_type" | "discount_value">): string {
  if (promo.discount_type === "percent") {
    return `${promo.discount_value}% off`
  }
  return `$${(Number(promo.discount_value) / 100).toFixed(2)} off`
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export const MIN_FEEDBACK_CHARS = 12

export function isThoughtfulFeedback(text: string): boolean {
  return text.trim().length >= MIN_FEEDBACK_CHARS
}
