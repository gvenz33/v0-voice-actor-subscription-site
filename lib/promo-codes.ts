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
export const BETA_PROMO_CODE = "BETA"

export const BETA_FEEDBACK_PROGRAM_CODES = [BETA_PROMO_CODE, BLUMVOX_PROMO_CODE] as const

export type BetaFeedbackProgram = (typeof BETA_FEEDBACK_PROGRAM_CODES)[number]

export function parseBetaFeedbackProgram(
  value: string | null | undefined
): BetaFeedbackProgram | null {
  const normalized = normalizePromoCode(value ?? "")
  if ((BETA_FEEDBACK_PROGRAM_CODES as readonly string[]).includes(normalized)) {
    return normalized as BetaFeedbackProgram
  }
  return null
}

export const BLUMVOX_DISCLAIMER =
  "Beta program terms & conditions: By using promo code BLUMVOX, you join the BlumVox / BVS beta program with an initial 3-month prepay at 50% off Momentum or Command. During those three months you must complete one short monthly feedback form (thoughtful, usable responses). If you complete all three monthly feedbacks, you keep the discounted rate on a month-to-month basis afterward. If you do not complete the required feedback, you can continue at the regular monthly rate after the initial 3 months. Promo applies to Momentum and Command with 3-month prepay only at signup."

export const BETA_ANNUAL_DISCLAIMER =
  "Beta program terms & conditions: By using promo code BETA, you join the VO Biz Suite Beta program and agree to active participation — complete one short monthly feedback form for Month 1, Month 2, and Month 3 (thoughtful, usable responses) during your 12-month annual plan. After 12 months, beta users who actively participated can keep the discounted rate on monthly or yearly billing. Beta users who did not participate can continue at the regular monthly or yearly rate. Promo applies to Momentum and Command with 12-month (annual) prepay only."

/** @deprecated Prefer getPromoDisclaimer(code) — kept for checkout fallbacks */
export const BETA_DISCLAIMER = BETA_ANNUAL_DISCLAIMER

export function getPromoDisclaimer(code: string | null | undefined): string | null {
  const normalized = normalizePromoCode(code ?? "")
  if (normalized === BETA_PROMO_CODE) return BETA_ANNUAL_DISCLAIMER
  if (normalized === BLUMVOX_PROMO_CODE) return BLUMVOX_DISCLAIMER
  return null
}

export function isBetaFeedbackPromo(code: string | null | undefined): boolean {
  const normalized = normalizePromoCode(code ?? "")
  return (BETA_FEEDBACK_PROGRAM_CODES as readonly string[]).includes(normalized)
}

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

  // BlumVox students: initial 3-month prepay only (month-to-month retention is post-feedback)
  if (normalizePromoCode(promo.code) === BLUMVOX_PROMO_CODE && interval !== "quarter") {
    return {
      valid: false,
      error:
        "BLUMVOX starts with a 3-month prepay plan only. After you complete Months 1–3 feedback, you can keep the discount month-to-month.",
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
