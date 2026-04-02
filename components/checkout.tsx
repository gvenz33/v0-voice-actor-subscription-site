'use client'

import { useCallback } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession } from '@/app/actions/stripe'
import { createClient } from '@/lib/supabase/client'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Checkout({ productId, billingInterval = 'month' }: { productId: string; billingInterval?: 'month' | 'year' }) {
  const fetchClientSecret = useCallback(
    async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      return startCheckoutSession(productId, billingInterval, user?.id ?? null)
    },
    [productId, billingInterval],
  )

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
