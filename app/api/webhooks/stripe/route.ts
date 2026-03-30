import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { addPurchasedTokens } from '@/lib/ai-limits'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Create a Supabase admin client for webhook handling
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Map Stripe product metadata to subscription tier
function getTierFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  if (!metadata) return null
  return metadata.tier || metadata.product_id || null
}

// Update user's subscription tier in the database
async function updateUserSubscriptionTier(userId: string, tier: string) {
  const supabase = getSupabaseAdmin()
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_tier: tier,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Failed to update subscription tier:', error)
    throw error
  }
  
  console.log(`Updated user ${userId} to tier: ${tier}`)
}

// Find user by Stripe customer ID
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  
  return data?.id || null
}

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
      event = stripe.webhooks.constructEvent(
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
      
      // Handle token purchase
      if (session.metadata?.tokens && session.metadata?.user_id) {
        const tokens = parseInt(session.metadata.tokens, 10)
        const userId = session.metadata.user_id
        
        if (tokens > 0 && userId) {
          try {
            await addPurchasedTokens(userId, tokens)
            console.log(`Added ${tokens} tokens to user ${userId}`)
          } catch (error) {
            console.error('Failed to add tokens:', error)
          }
        }
      }
      
      // Handle subscription checkout completion
      if (session.mode === 'subscription' && session.metadata?.tier && session.metadata?.user_id) {
        const userId = session.metadata.user_id
        const tier = session.metadata.tier
        
        try {
          await updateUserSubscriptionTier(userId, tier)
          console.log(`Subscription activated for user ${userId}, tier: ${tier}`)
        } catch (error) {
          console.error('Failed to update subscription tier:', error)
        }
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      
      // Get user ID from subscription metadata or customer lookup
      let userId = subscription.metadata?.user_id
      
      if (!userId && subscription.customer) {
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id
        userId = await findUserByCustomerId(customerId) || undefined
      }
      
      if (!userId) {
        console.log('No user ID found for subscription:', subscription.id)
        break
      }
      
      // Get tier from subscription metadata
      const tier = getTierFromMetadata(subscription.metadata)
      
      if (tier && subscription.status === 'active') {
        try {
          await updateUserSubscriptionTier(userId, tier)
          console.log(`Subscription ${event.type} for user ${userId}, tier: ${tier}`)
        } catch (error) {
          console.error('Failed to update subscription tier:', error)
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      
      // Get user ID from subscription metadata or customer lookup
      let userId = subscription.metadata?.user_id
      
      if (!userId && subscription.customer) {
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id
        userId = await findUserByCustomerId(customerId) || undefined
      }
      
      if (userId) {
        try {
          // Downgrade to free tier when subscription is cancelled
          await updateUserSubscriptionTier(userId, 'free')
          console.log(`Subscription cancelled for user ${userId}, downgraded to free`)
        } catch (error) {
          console.error('Failed to downgrade subscription:', error)
        }
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      
      // Handle successful subscription renewal
      if (invoice.subscription) {
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id
        
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const tier = getTierFromMetadata(subscription.metadata)
          
          let userId = subscription.metadata?.user_id
          if (!userId && subscription.customer) {
            const customerId = typeof subscription.customer === 'string' 
              ? subscription.customer 
              : subscription.customer.id
            userId = await findUserByCustomerId(customerId) || undefined
          }
          
          if (userId && tier) {
            await updateUserSubscriptionTier(userId, tier)
            console.log(`Invoice paid, confirmed tier ${tier} for user ${userId}`)
          }
        } catch (error) {
          console.error('Failed to process invoice payment:', error)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log(`Payment failed for invoice ${invoice.id}`)
      // You could send a notification email here or update user status
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
