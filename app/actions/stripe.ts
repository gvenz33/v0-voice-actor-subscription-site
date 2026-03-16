'use server'

import { stripe } from '@/lib/stripe'
import { PRODUCTS, getProductPrice } from '@/lib/products'
import { TOKEN_PACKAGES } from '@/lib/token-products'
import { createClient } from '@/lib/supabase/server'

export async function startCheckoutSession(productId: string, billingInterval: 'month' | 'year' = 'month') {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const priceInCents = getProductPrice(product, billingInterval)
  const intervalLabel = billingInterval === 'year' ? 'Annual' : 'Monthly'

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
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
  })

  return session.client_secret
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

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
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
