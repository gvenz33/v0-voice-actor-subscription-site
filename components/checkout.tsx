'use client'

import { useCallback } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession } from '@/app/actions/stripe'
import { createClient } from '@/lib/supabase/client'
import { getStripePublishableKey } from '@/lib/stripe-public'

const stripePromise = loadStripe(getStripePublishableKey()!)

export default function Checkout({ productId, billingInterval = 'month' }: { productId: string; billingInterval?: 'month' | 'year' }) {
  const fetchClientSecret = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const secret = await startCheckoutSession(
      productId,
      billingInterval,
      user?.id ?? null,
    )
    if (secret == null) {
      throw new Error("Checkout session missing client secret")
    }
    return secret
  }, [productId, billingInterval])

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
