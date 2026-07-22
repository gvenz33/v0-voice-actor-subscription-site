import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { addPurchasedTokens } from "@/lib/ai-limits"
import Stripe from "stripe"
import { recordPromoRedemption } from "@/lib/promo-codes-server"
import { ensureBetaEnrollmentForUser } from "@/lib/beta-feedback"
import {
  BETA_PROMO_CODE,
  isBetaFeedbackPromo,
  normalizePromoCode,
} from "@/lib/promo-codes"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  syncTierFromStripeSubscription,
  updateProfileSubscriptionTier,
} from "@/lib/stripe-profile-sync"
import type { SubscriptionTier } from "@/lib/ai-limits"
import { tierFromProductId } from "@/lib/stripe-subscription-tier"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } else {
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let supabase: ReturnType<typeof createAdminClient> | null = null
  try {
    supabase = createAdminClient()
  } catch (err) {
    console.error("[stripe webhook] Admin client unavailable:", err)
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      if (
        supabase &&
        session.mode === "payment" &&
        session.metadata?.invoice_id &&
        (session.metadata.payment_type === "invoice" || event.account)
      ) {
        const invoiceId = session.metadata.invoice_id
        const paidAt = new Date().toISOString()

        const { data: existing } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .maybeSingle()

        if (existing && existing.status !== "paid") {
          const { error: invoiceUpdateError } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_at: paidAt,
              stripe_payment_link_id: session.id,
            })
            .eq("id", invoiceId)

          if (invoiceUpdateError) {
            console.error("[stripe webhook] invoice paid update failed:", invoiceUpdateError)
          }
        }
      }

      if (session.metadata?.tokens && session.metadata?.user_id) {
        const tokens = parseInt(session.metadata.tokens, 10)
        const userId = session.metadata.user_id

        if (tokens > 0 && userId) {
          try {
            await addPurchasedTokens(userId, tokens)
          } catch (error) {
            console.error("Failed to add tokens:", error)
          }
        }
      }

      if (supabase && session.mode === "subscription") {
        const userId = session.metadata?.user_id ?? null
        let tier =
          (session.metadata?.tier as SubscriptionTier | undefined) ??
          tierFromProductId(session.metadata?.product_id) ??
          "free"

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null

        if (userId && tier) {
          const result = await updateProfileSubscriptionTier(supabase, {
            tier,
            userId,
            stripeCustomerIdToSave: customerId,
          })
          if (result.error) {
            console.error("[stripe webhook] Tier update failed:", result.error)
          }
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id

        if (subscriptionId && session.metadata) {
          try {
            await getStripe().subscriptions.update(subscriptionId, {
              metadata: {
                ...session.metadata,
                user_id: userId ?? session.metadata.user_id ?? "",
              },
            })
          } catch (error) {
            console.error("[stripe webhook] Subscription metadata update failed:", error)
          }
        }
      }

      if (session.metadata?.promo_code_id) {
        try {
          await recordPromoRedemption({
            promoCodeId: session.metadata.promo_code_id,
            userId: session.metadata.user_id ?? null,
            stripeSessionId: session.id,
            tier: session.metadata.tier ?? null,
            billingInterval: session.metadata.billing_interval ?? null,
            discountAppliedCents: session.metadata.discount_applied_cents
              ? parseInt(session.metadata.discount_applied_cents, 10)
              : 0,
          })

          const promoCode = session.metadata.promo_code
            ? normalizePromoCode(session.metadata.promo_code)
            : ""
          if (
            session.metadata.user_id &&
            (isBetaFeedbackPromo(promoCode) ||
              session.metadata.beta_acknowledged === "true")
          ) {
            await ensureBetaEnrollmentForUser(
              session.metadata.user_id,
              promoCode || BETA_PROMO_CODE
            )
          }
        } catch (error) {
          console.error("Failed to record promo redemption:", error)
        }
      }
      break
    }

    case "customer.subscription.updated": {
      if (!supabase) break
      const subscription = event.data.object as Stripe.Subscription
      const result = await syncTierFromStripeSubscription(supabase, subscription)
      if (result.error) {
        console.error("[stripe webhook] subscription.updated sync failed:", result.error)
      }
      break
    }

    case "customer.subscription.deleted": {
      if (!supabase) break
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id ?? null
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null

      const result = await updateProfileSubscriptionTier(supabase, {
        tier: "free",
        userId,
        stripeCustomerId: userId ? null : customerId,
      })
      if (result.error) {
        console.error("[stripe webhook] subscription.deleted sync failed:", result.error)
      }
      break
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(`Payment succeeded: ${paymentIntent.id}`)
      break
    }

    case "invoice.payment_failed": {
      console.log("[stripe webhook] invoice.payment_failed", event.id)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
