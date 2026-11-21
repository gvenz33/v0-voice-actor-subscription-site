'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const stripePublishableKey = getStripePublishableKey()
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

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
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const checkoutRef = useRef<HTMLDivElement | null>(null)

  const requiresAcknowledgement = appliedPromo?.requiresFeedbackAcknowledgement ?? false
  const canProceedToCheckout =
    !requiresAcknowledgement || betaAcknowledged

  useEffect(() => {
    if (initialPromoCode) {
      void applyPromoCode(initialPromoCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPromoCode, productId, billingInterval])

  // Reset checkout only when the offer changes — not when T&Cs are accepted.
  useEffect(() => {
    setCheckoutEnabled(false)
    setCheckoutError(null)
  }, [appliedPromo?.code, billingInterval, productId])

  // If they uncheck T&Cs after opening checkout, close it again.
  useEffect(() => {
    if (requiresAcknowledgement && !betaAcknowledged) {
      setCheckoutEnabled(false)
      setCheckoutError(null)
    }
  }, [requiresAcknowledgement, betaAcknowledged])

  useEffect(() => {
    if (checkoutEnabled && checkoutRef.current) {
      checkoutRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [checkoutEnabled])

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
      setCheckoutEnabled(false)
    } catch {
      setAppliedPromo(null)
      setPromoError('Could not validate promo code.')
    } finally {
      setPromoLoading(false)
    }
  }

  const fetchClientSecret = useCallback(async () => {
    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start checkout. Please try again.'
      setCheckoutError(message)
      throw err
    } finally {
      setCheckoutLoading(false)
    }
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

  const openCheckout = () => {
    if (!canProceedToCheckout) return
    if (!stripePromise) {
      setCheckoutError(
        'Stripe is not configured for this site. Please contact support at hello@vobizsuite.io.'
      )
      return
    }
    setCheckoutError(null)
    setCheckoutEnabled(true)
  }

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
              placeholder="Promo Code? Type Here."
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
            {appliedPromo.requiresFeedbackAcknowledgement && (
              <p className="mt-2 text-amber-700 dark:text-amber-400">
                This promo enrolls you in a beta program. Review and accept the terms &amp; conditions below
                before checkout.
              </p>
            )}
          </div>
        )}
      </div>

      {requiresAcknowledgement && (
        <div
          className={
            betaAcknowledged
              ? "rounded-xl border-2 border-green-500/50 bg-green-500/10 p-5 shadow-[0_0_0_1px_rgba(34,197,94,0.15)]"
              : "rounded-xl border-2 border-amber-400 bg-amber-500/15 p-5 shadow-[0_0_0_4px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/40"
          }
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={
                betaAcknowledged
                  ? "mt-0.5 size-6 shrink-0 text-green-500"
                  : "mt-0.5 size-6 shrink-0 text-amber-500"
              }
            />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Program Terms &amp; Conditions
                  </h2>
                  {!betaAcknowledged && (
                    <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-black">
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  {appliedPromo?.disclaimer ??
                    getPromoDisclaimer(appliedPromo?.code) ??
                    BETA_ANNUAL_DISCLAIMER}
                </p>
              </div>
              <label
                className={
                  betaAcknowledged
                    ? "flex cursor-pointer items-start gap-4 rounded-lg border border-green-500/40 bg-background/70 p-4"
                    : "flex cursor-pointer items-start gap-4 rounded-lg border-2 border-amber-400 bg-background/80 p-4 shadow-sm"
                }
              >
                <Checkbox
                  checked={betaAcknowledged}
                  onCheckedChange={(checked) => setBetaAcknowledged(checked === true)}
                  className="mt-0.5 size-6 border-2 border-amber-500 data-[state=checked]:border-green-500 data-[state=checked]:bg-green-600"
                />
                <span className="text-sm font-medium leading-relaxed text-foreground">
                  {appliedPromo?.code?.toUpperCase() === "BLUMVOX"
                    ? "I have read and agree to the BlumVox / BVS beta program terms & conditions: monthly billing at the promo rate, one monthly feedback form for Months 1–3, and continued discounted monthly billing only if all three feedbacks are completed."
                    : "I have read and agree to the VO Biz Suite Beta program terms & conditions, including completing one monthly feedback form for Months 1–3 and maintaining the 12-month annual beta subscription."}
                </span>
              </label>
              {!betaAcknowledged && (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Check the box above to accept before continuing to checkout.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!checkoutEnabled ? (
        <div className="rounded-xl border border-border bg-background p-5 text-center">
          <p
            className={
              requiresAcknowledgement && !betaAcknowledged
                ? "text-sm font-medium text-amber-700 dark:text-amber-300"
                : "text-sm text-muted-foreground"
            }
          >
            {requiresAcknowledgement && !betaAcknowledged
              ? 'Please accept the program terms & conditions above to continue to checkout.'
              : 'Ready to complete your subscription?'}
          </p>
          {checkoutError && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {checkoutError}
            </p>
          )}
          <Button
            type="button"
            className="mt-4"
            disabled={!canProceedToCheckout}
            onClick={openCheckout}
          >
            Continue to Checkout
          </Button>
        </div>
      ) : (
        <div
          id="checkout"
          ref={checkoutRef}
          key={checkoutKey}
          className="min-h-[480px] rounded-xl border border-border bg-background p-2 sm:p-4"
        >
          {checkoutLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading secure checkout…
            </div>
          )}
          {checkoutError && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {checkoutError}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setCheckoutError(null)
                  setCheckoutEnabled(false)
                  Promise.resolve().then(openCheckout)
                }}
              >
                Try again
              </Button>
            </div>
          )}
          {stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <p className="py-8 text-center text-sm text-destructive">
              Stripe publishable key is missing. Contact hello@vobizsuite.io.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
