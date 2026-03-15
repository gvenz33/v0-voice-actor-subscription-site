'use server'

import { stripe } from '@/lib/stripe'
import { PRODUCTS, getProductPrice } from '@/lib/products'

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
