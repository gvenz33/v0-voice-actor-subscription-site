import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import type { SubscriptionTier } from "@/lib/ai-limits"
import { tierForActiveSubscription } from "@/lib/stripe-subscription-tier"

export async function updateProfileSubscriptionTier(
  supabase: SupabaseClient,
  params: {
    tier: SubscriptionTier
    userId?: string | null
    stripeCustomerId?: string | null
    stripeCustomerIdToSave?: string | null
  }
): Promise<{ updated: boolean; error?: string }> {
  const payload: Record<string, string> = {
    subscription_tier: params.tier,
    updated_at: new Date().toISOString(),
  }

  if (params.stripeCustomerIdToSave) {
    payload.stripe_customer_id = params.stripeCustomerIdToSave
  }

  if (params.userId) {
    const payloadWithTrial: Record<string, unknown> = { ...payload }
    if (params.tier !== "free") {
      payloadWithTrial.trial_exempt = true
    }

    const { error } = await supabase
      .from("profiles")
      .update(payloadWithTrial)
      .eq("id", params.userId)

    if (error) return { updated: false, error: error.message }
    return { updated: true }
  }

  if (params.stripeCustomerId) {
    const payloadWithTrial: Record<string, unknown> = { ...payload }
    if (params.tier !== "free") {
      payloadWithTrial.trial_exempt = true
    }

    const { error } = await supabase
      .from("profiles")
      .update(payloadWithTrial)
      .eq("stripe_customer_id", params.stripeCustomerId)

    if (error) return { updated: false, error: error.message }
    return { updated: true }
  }

  return { updated: false, error: "No user id or stripe customer id" }
}

export async function syncTierFromStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const tier = tierForActiveSubscription(subscription)
  const userId = subscription.metadata?.user_id ?? null
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null

  return updateProfileSubscriptionTier(supabase, {
    tier,
    userId,
    stripeCustomerId: userId ? null : customerId,
    stripeCustomerIdToSave: customerId,
  })
}
