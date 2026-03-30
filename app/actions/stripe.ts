'use server'

import { stripe } from '@/lib/stripe'
import { PRODUCTS, getProductPrice } from '@/lib/products'
import { TOKEN_PACKAGES } from '@/lib/token-products'
import { createClient } from '@/lib/supabase/server'

// Get or create a Stripe customer for the current user
async function getOrCreateStripeCustomer(userId: string, email: string) {
  const supabase = await createClient()
  
  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()
  
  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }
  
  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })
  
  // Save the customer ID to the profile
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)
  
  return customer.id
}

// Get the user's current active subscription
async function getActiveSubscription(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })
  
  return subscriptions.data[0] || null
}

export async function startCheckoutSession(productId: string, billingInterval: 'month' | 'year' = 'month') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const priceInCents = getProductPrice(product, billingInterval)
  const intervalLabel = billingInterval === 'year' ? 'Annual' : 'Monthly'

  // If user is logged in, get or create their Stripe customer
  let customerId: string | undefined
  if (user) {
    customerId = await getOrCreateStripeCustomer(user.id, user.email!)
    
    // Check if user has an existing subscription
    const existingSubscription = await getActiveSubscription(customerId)
    
    if (existingSubscription) {
      // User has an active subscription - create a subscription update session
      // This handles upgrades/downgrades with proration
      return await createSubscriptionUpdateSession(existingSubscription.id, productId, billingInterval, user.id)
    }
  }

  // Create a new subscription checkout session
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    customer: customerId,
    customer_email: customerId ? undefined : user?.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `VO Biz Suite - ${product.name} (${intervalLabel})`,
            description: product.description,
          },
          unit_amount: priceInCents,
          recurring: {
            interval: billingInterval,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    metadata: {
      user_id: user?.id || '',
      product_id: productId,
      tier: product.tier,
    },
    subscription_data: {
      metadata: {
        user_id: user?.id || '',
        product_id: productId,
        tier: product.tier,
      },
    },
  })

  return session.client_secret
}

// Create a session for updating an existing subscription (upgrade/downgrade)
async function createSubscriptionUpdateSession(
  subscriptionId: string,
  newProductId: string,
  billingInterval: 'month' | 'year',
  userId: string
) {
  const product = PRODUCTS.find((p) => p.id === newProductId)
  if (!product) {
    throw new Error(`Product with id "${newProductId}" not found`)
  }

  const priceInCents = getProductPrice(product, billingInterval)
  const intervalLabel = billingInterval === 'year' ? 'Annual' : 'Monthly'

  // Create a new price for the product
  const price = await stripe.prices.create({
    currency: 'usd',
    product_data: {
      name: `VO Biz Suite - ${product.name} (${intervalLabel})`,
    },
    unit_amount: priceInCents,
    recurring: {
      interval: billingInterval,
    },
  })

  // Get the current subscription to find the item to update
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const currentItem = subscription.items.data[0]

  // Update the subscription with the new price
  // proration_behavior: 'create_prorations' will handle upgrade/downgrade pricing
  // billing_cycle_anchor: 'unchanged' keeps the same billing date
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: currentItem.id,
        price: price.id,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      user_id: userId,
      product_id: newProductId,
      tier: product.tier,
    },
  })

  // Return a special response indicating the subscription was updated directly
  // The webhook will handle updating the user's tier
  return `subscription_updated:${updatedSubscription.id}:${product.tier}`
}

// Create a portal session for managing subscriptions
export async function createPortalSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    throw new Error('No Stripe customer found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings`,
  })

  return session.url
}

export async function startTokenCheckoutSession(packageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const tokenPackage = TOKEN_PACKAGES.find((p) => p.id === packageId)
  if (!tokenPackage) {
    throw new Error(`Package with id "${packageId}" not found`)
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(user.id, user.email!)

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tokenPackage.name} Token Package`,
            description: `${tokenPackage.tokens} tokens for VO Biz Suite`,
          },
          unit_amount: tokenPackage.priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: {
      user_id: user.id,
      package_id: packageId,
      tokens: tokenPackage.tokens.toString(),
    },
  })

  return session.client_secret
}
