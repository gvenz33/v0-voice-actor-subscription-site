'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession } from '@/app/actions/stripe'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Checkout({ productId, billingInterval = 'month' }: { productId: string; billingInterval?: 'month' | 'year' }) {
  const router = useRouter()
  const [subscriptionUpdated, setSubscriptionUpdated] = useState(false)
  const [newTier, setNewTier] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    async function initCheckout() {
      try {
        setLoading(true)
        setError(null)
        const result = await startCheckoutSession(productId, billingInterval)
        
        // Check if this is a subscription update (not a new checkout session)
        if (result?.startsWith('subscription_updated:')) {
          const parts = result.split(':')
          setNewTier(parts[2] || productId)
          setSubscriptionUpdated(true)
        } else if (result) {
          setClientSecret(result)
        } else {
          setError('Failed to initialize checkout')
        }
      } catch (err) {
        console.error('Checkout error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize checkout')
      } finally {
        setLoading(false)
      }
    }
    
    initCheckout()
  }, [productId, billingInterval])

  // If subscription was updated directly (upgrade/downgrade)
  if (subscriptionUpdated) {
    const tierName = newTier.charAt(0).toUpperCase() + newTier.slice(1)
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-foreground">Subscription Updated!</CardTitle>
          <CardDescription className="text-base">
            Your plan has been changed to <span className="font-semibold text-foreground">{tierName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground">
            The change will be reflected in your account immediately. Any prorated charges or credits will be applied to your next invoice.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push('/dashboard')} size="lg" className="min-h-[44px]">
              Go to Dashboard
            </Button>
            <Button onClick={() => router.push('/dashboard/settings')} variant="outline" size="lg" className="min-h-[44px]">
              View Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Preparing checkout...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => router.push('/#pricing')} variant="outline">
            Back to Pricing
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Normal checkout flow
  if (!clientSecret) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-destructive">Unable to load checkout</p>
          <Button onClick={() => router.push('/#pricing')} variant="outline">
            Back to Pricing
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
