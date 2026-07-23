'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession } from '@/app/actions/stripe'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Loader2, Tag } from 'lucide-react'
import { BETA_ANNUAL_DISCLAIMER, formatCents, getPromoDisclaimer } from '@/lib/promo-codes'
import { getStripePublishableKey } from '@/lib/stripe-public'

const stripePromise = loadStripe(getStripePublishableKey()!)

interface PromoState {
  code: string
  discountAppliedCents: number
  originalPriceInCents: number
  discountedPriceInCents: number
  requiresFeedbackAcknowledgement: boolean
  disclaimer: string | null
}

export default function CheckoutFlow({
  productId,
  billingInterval,
  initialPromoCode = '',
}: {
  productId: string
  billingInterval: 'month' | 'year' | 'quarter'
  initialPromoCode?: string
}) {
  const [promoInput, setPromoInput] = useState(initialPromoCode)
  const [appliedPromo, setAppliedPromo] = useState<PromoState | null>(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [betaAcknowledged, setBetaAcknowledged] = useState(false)
  const [checkoutEnabled, setCheckoutEnabled] = useState(false)

  const requiresAcknowledgement = appliedPromo?.requiresFeedbackAcknowledgement ?? false
  const canProceedToCheckout =
    !requiresAcknowledgement || betaAcknowledged

  useEffect(() => {
    if (initialPromoCode) {
      void applyPromoCode(initialPromoCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPromoCode, productId, billingInterval])

  useEffect(() => {
    setCheckoutEnabled(false)
  }, [appliedPromo, betaAcknowledged, billingInterval, productId])

  const applyPromoCode = async (codeOverride?: string) => {
    const code = (codeOverride ?? promoInput).trim()
    if (!code) {
      setAppliedPromo(null)
      setPromoError('')
      return
    }

    setPromoLoading(true)
    setPromoError('')

    try {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          productId,
          interval: billingInterval,
        }),
      })

      const data = (await res.json()) as {
        valid?: boolean
        error?: string
        code?: string
        discountAppliedCents?: number
        originalPriceInCents?: number
        discountedPriceInCents?: number
        requiresFeedbackAcknowledgement?: boolean
        disclaimer?: string | null
      }

      if (!res.ok || !data.valid) {
        setAppliedPromo(null)
        setPromoError(data.error || 'Invalid promo code.')
        return
      }

      setAppliedPromo({
        code: data.code ?? code.toUpperCase(),
        discountAppliedCents: data.discountAppliedCents ?? 0,
        originalPriceInCents: data.originalPriceInCents ?? 0,
        discountedPriceInCents: data.discountedPriceInCents ?? 0,
        requiresFeedbackAcknowledgement: data.requiresFeedbackAcknowledgement ?? false,
        disclaimer: data.disclaimer ?? null,
      })
      setPromoInput(data.code ?? code)
      setBetaAcknowledged(false)
    } catch {
      setAppliedPromo(null)
      setPromoError('Could not validate promo code.')
    } finally {
      setPromoLoading(false)
    }
  }

  const fetchClientSecret = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const secret = await startCheckoutSession(
      productId,
      billingInterval,
      user?.id ?? null,
      appliedPromo?.code ?? null,
      requiresAcknowledgement ? betaAcknowledged : undefined,
    )

    if (secret == null) {
      throw new Error('Checkout session missing client secret')
    }

    return secret
  }, [
    productId,
    billingInterval,
    appliedPromo?.code,
    requiresAcknowledgement,
    betaAcknowledged,
  ])

  const checkoutKey = useMemo(
    () =>
      [
        productId,
        billingInterval,
        appliedPromo?.code ?? 'none',
        betaAcknowledged ? 'ack' : 'no-ack',
      ].join(':'),
    [productId, billingInterval, appliedPromo?.code, betaAcknowledged]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Promo Code</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Have a beta or promotional code? Apply it before checkout.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="promo-code" className="sr-only">
              Promo code
            </Label>
            <Input
              id="promo-code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g. BETA)"
              disabled={promoLoading}
            />
          </div>
          <Button
            type="button"
            variant="success"
            disabled={promoLoading || !promoInput.trim()}
            onClick={() => void applyPromoCode()}
          >
            {promoLoading ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>

        {promoError && (
          <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {promoError}
          </p>
        )}

        {appliedPromo && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">
              Code <span className="font-mono">{appliedPromo.code}</span> applied
            </p>
            <p className="mt-1 text-muted-foreground">
              {formatCents(appliedPromo.originalPriceInCents)} →{' '}
              <span className="font-semibold text-foreground">
                {formatCents(appliedPromo.discountedPriceInCents)}
              </span>{' '}
              ({formatCents(appliedPromo.discountAppliedCents)} saved)
            </p>
          </div>
        )}
      </div>

      {requiresAcknowledgement && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Active Beta Participation</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {appliedPromo?.disclaimer ??
                    getPromoDisclaimer(appliedPromo?.code) ??
                    BETA_ANNUAL_DISCLAIMER}
                </p>
              </div>
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={betaAcknowledged}
                  onCheckedChange={(checked) => setBetaAcknowledged(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground">
                  {appliedPromo?.code?.toUpperCase() === "BLUMVOX"
                    ? "I agree to active beta participation: complete one monthly feedback form for Months 1–3 with thoughtful, usable responses."
                    : "I agree to active beta participation: complete one monthly feedback form for Months 1–3, and maintain the 12-month annual beta subscription."}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {!checkoutEnabled ? (
        <div className="rounded-xl border border-border bg-background p-5 text-center">
          <p className="text-sm text-muted-foreground">
            {requiresAcknowledgement && !betaAcknowledged
              ? 'Please accept the Beta tester agreement to continue to checkout.'
              : 'Ready to complete your subscription?'}
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={!canProceedToCheckout}
            onClick={() => setCheckoutEnabled(true)}
          >
            Continue to Checkout
          </Button>
        </div>
      ) : (
        <div id="checkout" key={checkoutKey}>
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  )
}
