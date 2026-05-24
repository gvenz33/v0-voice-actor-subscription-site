import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { addPurchasedTokens } from '@/lib/ai-limits'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { recordPromoRedemption } from '@/lib/promo-codes-server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // If STRIPE_WEBHOOK_SECRET is set, verify the signature
    // Otherwise, parse the event directly (for testing)
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
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Check if this is a token purchase (has tokens in metadata)
      if (session.metadata?.tokens && session.metadata?.user_id) {
        const tokens = parseInt(session.metadata.tokens, 10)
        const userId = session.metadata.user_id
        
        if (tokens > 0 && userId) {
          try {
            await addPurchasedTokens(userId, tokens)
            console.log(`Added ${tokens} tokens to user ${userId}`)
          } catch (error) {
            console.error('Failed to add tokens:', error)
            // Don't return error - Stripe will retry
          }
        }
      }

      // Check if this is a subscription purchase (has tier + user_id in metadata)
      if (session.metadata?.tier && session.metadata?.user_id) {
        const userId = session.metadata.user_id
        const tier = session.metadata.tier

        if (userId && tier) {
          try {
            const supabase = await createClient()
            await supabase
              .from('profiles')
              .update({ subscription_tier: tier })
              .eq('id', userId)
          } catch (error) {
            console.error('Failed to update subscription tier:', error)
            // Don't return error - Stripe will retry
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
        } catch (error) {
          console.error('Failed to record promo redemption:', error)
        }
      }
      break
    }

    case 'payment_intent.succeeded': {
      // Log successful payments
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(`Payment succeeded: ${paymentIntent.id}`)
      break
    }

    default:
      // Unhandled event type
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
