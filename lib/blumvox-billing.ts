import "server-only"

import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { PRODUCTS } from "@/lib/products"
import { BLUMVOX_PROMO_CODE, normalizePromoCode } from "@/lib/promo-codes"
import type { SubscriptionTier } from "@/lib/ai-limits"

type RetentionMode = "retained_discount" | "regular_rate"

async function findBlumvoxSubscription(customerId: string) {
  const stripe = getStripe()
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 10,
  })

  return (
    subscriptions.data.find(
      (s) => normalizePromoCode(s.metadata?.promo_code ?? "") === BLUMVOX_PROMO_CODE
    ) ?? subscriptions.data[0] ??
    null
  )
}

async function scheduleMonthlyConversion(
  userId: string,
  mode: RetentionMode
): Promise<void> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, subscription_tier")
    .eq("id", userId)
    .maybeSingle()

  const customerId = profile?.stripe_customer_id
  if (!customerId) {
    console.warn("[blumvox] No stripe_customer_id for monthly conversion", { userId, mode })
    return
  }

  const stripe = getStripe()
  const subscription = await findBlumvoxSubscription(customerId)
  if (!subscription) {
    console.warn("[blumvox] No active subscription to convert", { userId, mode })
    return
  }

  if (subscription.metadata?.blumvox_retention === mode) {
    return
  }

  // Already on monthly retention billing
  const currentInterval = subscription.items.data[0]?.price?.recurring
  if (
    currentInterval?.interval === "month" &&
    (currentInterval.interval_count ?? 1) === 1 &&
    subscription.metadata?.blumvox_retention
  ) {
    return
  }

  const item = subscription.items.data[0]
  if (!item) return

  const tier = (subscription.metadata?.tier ?? profile?.subscription_tier) as
    | SubscriptionTier
    | undefined
  const product = PRODUCTS.find((p) => p.tier === tier)
  if (!product || (product.tier !== "momentum" && product.tier !== "command")) {
    console.warn("[blumvox] Cannot resolve product tier for monthly conversion", {
      userId,
      tier,
      mode,
    })
    return
  }

  const unitAmount =
    mode === "retained_discount"
      ? Math.max(Math.round(product.monthlyPriceInCents * 0.5), 50)
      : product.monthlyPriceInCents

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval: "month" },
    product_data: {
      name:
        mode === "retained_discount"
          ? `VO Biz Suite - ${product.name} (BlumVox retained monthly)`
          : `VO Biz Suite - ${product.name} (Monthly)`,
    },
    metadata: {
      promo_code: BLUMVOX_PROMO_CODE,
      retention: mode,
      user_id: userId,
      tier: product.tier,
    },
  })

  const currentPriceId =
    typeof item.price === "string" ? item.price : item.price.id
  const periodEnd = subscription.current_period_end

  // Keep current prepaid quarter price until period end, then monthly.
  let scheduleId = typeof subscription.schedule === "string"
    ? subscription.schedule
    : subscription.schedule?.id

  if (!scheduleId) {
    const created = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    })
    scheduleId = created.id
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)
  const phaseStart = schedule.phases[0]?.start_date ?? subscription.start_date

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        start_date: phaseStart,
        end_date: periodEnd,
        items: [{ price: currentPriceId, quantity: 1 }],
      },
      {
        start_date: periodEnd,
        items: [{ price: price.id, quantity: 1 }],
        // Continue monthly after schedule releases
        iterations: 120,
      },
    ],
    metadata: {
      ...subscription.metadata,
      promo_code: BLUMVOX_PROMO_CODE,
      billing_interval: "month",
      blumvox_retention: mode,
      user_id: userId,
      tier: product.tier,
    },
  })

  await stripe.subscriptions.update(subscription.id, {
    metadata: {
      ...subscription.metadata,
      promo_code: BLUMVOX_PROMO_CODE,
      billing_interval: "month",
      blumvox_retention: mode,
      user_id: userId,
      tier: product.tier,
    },
  })
}

/**
 * After BlumVox Months 1–3 feedback is complete, convert the prepaid quarterly
 * subscription to month-to-month billing at the same 50% discount when the
 * initial 3-month period ends.
 */
export async function convertBlumvoxToRetainedMonthly(userId: string): Promise<void> {
  await scheduleMonthlyConversion(userId, "retained_discount")
}

/**
 * If the initial 3-month BlumVox window ended without completing feedback,
 * move the subscriber to regular monthly pricing when the prepaid period ends.
 */
export async function convertBlumvoxToRegularMonthly(userId: string): Promise<void> {
  await scheduleMonthlyConversion(userId, "regular_rate")
}
