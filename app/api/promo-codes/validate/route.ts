import { NextResponse } from "next/server"
import { validatePromoCodeForCheckout } from "@/lib/promo-codes-server"
import {
  BETA_DISCLAIMER,
  formatCents,
  formatPromoDiscount,
} from "@/lib/promo-codes"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string
      productId?: string
      interval?: "month" | "year"
    }

    if (!body.code?.trim() || !body.productId || !body.interval) {
      return NextResponse.json(
        { valid: false, error: "code, productId, and interval are required." },
        { status: 400 }
      )
    }

    const result = await validatePromoCodeForCheckout(
      body.code,
      body.productId,
      body.interval
    )

    if (!result.valid || !result.promo) {
      return NextResponse.json({ valid: false, error: result.error ?? "Invalid promo code." })
    }

    return NextResponse.json({
      valid: true,
      promoCodeId: result.promo.id,
      code: result.promo.code,
      description: result.promo.description,
      discountLabel: formatPromoDiscount(result.promo),
      originalPriceInCents: result.originalPriceInCents,
      discountedPriceInCents: result.discountedPriceInCents,
      discountAppliedCents: result.discountAppliedCents,
      originalPriceLabel: formatCents(result.originalPriceInCents ?? 0),
      discountedPriceLabel: formatCents(result.discountedPriceInCents ?? 0),
      billingIntervalRestriction: result.promo.billing_interval_restriction,
      requiresFeedbackAcknowledgement: result.promo.requires_feedback_acknowledgement,
      disclaimer: result.promo.requires_feedback_acknowledgement ? BETA_DISCLAIMER : null,
      appliesToTiers: result.promo.applies_to_tiers,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed."
    return NextResponse.json({ valid: false, error: message }, { status: 500 })
  }
}
