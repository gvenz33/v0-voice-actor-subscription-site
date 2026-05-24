'use server'

import { getStripe } from '@/lib/stripe'
import { PRODUCTS, getProductPrice } from '@/lib/products'
import { TOKEN_PACKAGES } from '@/lib/token-products'
import { createClient } from '@/lib/supabase/server'
import {
  validatePromoCodeForCheckout,
} from '@/lib/promo-codes-server'
import { BETA_DISCLAIMER } from '@/lib/promo-codes'

export async function startCheckoutSession(
  productId: string,
  billingInterval: 'month' | 'year' = 'month',
  userId?: string | null,
  promoCode?: string | null,
  betaAcknowledged?: boolean,
) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  let priceInCents = getProductPrice(product, billingInterval)
  let promoCodeId: string | undefined
  let promoCodeNormalized: string | undefined
  let discountAppliedCents = 0

  if (promoCode?.trim()) {
    const validation = await validatePromoCodeForCheckout(
      promoCode,
      productId,
      billingInterval
    )

    if (!validation.valid || !validation.promo) {
      throw new Error(validation.error ?? 'Invalid promo code.')
    }

    if (validation.promo.requires_feedback_acknowledgement && !betaAcknowledged) {
      throw new Error('You must accept the Beta tester agreement before checkout.')
    }

    priceInCents = validation.discountedPriceInCents ?? priceInCents
    discountAppliedCents = validation.discountAppliedCents ?? 0
    promoCodeId = validation.promo.id
    promoCodeNormalized = validation.promo.code
  }

  const intervalLabel = billingInterval === 'year' ? 'Annual' : 'Monthly'
  const discountNote =
    discountAppliedCents > 0
      ? ` (${promoCodeNormalized} discount applied)`
      : ''

  const session = await getStripe().checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    metadata: {
      ...(userId ? { user_id: userId } : {}),
      product_id: product.id,
      tier: product.tier,
      billing_interval: billingInterval,
      ...(promoCodeId ? { promo_code_id: promoCodeId } : {}),
      ...(promoCodeNormalized ? { promo_code: promoCodeNormalized } : {}),
      ...(discountAppliedCents > 0
        ? { discount_applied_cents: String(discountAppliedCents) }
        : {}),
      ...(betaAcknowledged ? { beta_acknowledged: 'true' } : {}),
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `VO Biz Suite - ${product.name} (${intervalLabel})${discountNote}`,
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

export async function getCheckoutPromoDetails(
  productId: string,
  billingInterval: 'month' | 'year',
  promoCode?: string | null,
) {
  if (!promoCode?.trim()) {
    return { valid: false as const }
  }

  const validation = await validatePromoCodeForCheckout(
    promoCode,
    productId,
    billingInterval
  )

  if (!validation.valid || !validation.promo) {
    return { valid: false as const, error: validation.error ?? 'Invalid promo code.' }
  }

  return {
    valid: true as const,
    code: validation.promo.code,
    discountAppliedCents: validation.discountAppliedCents ?? 0,
    originalPriceInCents: validation.originalPriceInCents ?? 0,
    discountedPriceInCents: validation.discountedPriceInCents ?? 0,
    requiresFeedbackAcknowledgement: validation.promo.requires_feedback_acknowledgement,
    disclaimer: validation.promo.requires_feedback_acknowledgement ? BETA_DISCLAIMER : null,
    billingIntervalRestriction: validation.promo.billing_interval_restriction,
  }
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

  const session = await getStripe().checkout.sessions.create({
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
