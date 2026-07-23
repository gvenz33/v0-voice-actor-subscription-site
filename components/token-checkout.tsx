'use client'

import { useCallback } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

import { startTokenCheckoutSession } from '@/app/actions/stripe'
import { getStripePublishableKey } from '@/lib/stripe-public'

const stripePromise = loadStripe(getStripePublishableKey()!)

export default function TokenCheckout({ packageId, onComplete }: { packageId: string; onComplete?: () => void }) {
  const fetchClientSecret = useCallback(async () => {
    const secret = await startTokenCheckoutSession(packageId)
    if (secret == null) {
      throw new Error("Checkout session missing client secret")
    }
    return secret
  }, [packageId])

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ 
          fetchClientSecret,
          onComplete: onComplete,
        }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
