'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { PRODUCTS, getEffectiveMonthlyPrice, getProductPrice, type BillingInterval } from '@/lib/products'
import { BETA_PROMO_CODE, BLUMVOX_PROMO_CODE, TIER_MARKETING_NAMES, formatCents } from '@/lib/promo-codes'
import { cn } from '@/lib/utils'

function parseInterval(raw: string | null): BillingInterval {
  if (raw === 'year') return 'year'
  if (raw === 'quarter') return 'quarter'
  return 'month'
}

export function Pricing() {
  const searchParams = useSearchParams()
  const promoFromUrl = searchParams.get('promo') ?? ''
  const intervalFromUrl = searchParams.get('interval')
  const promoUpper = promoFromUrl.trim().toUpperCase()
  const isBlumvox = promoUpper === BLUMVOX_PROMO_CODE
  const isBeta = promoUpper === BETA_PROMO_CODE
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(() => {
    const parsed = parseInterval(intervalFromUrl)
    if (isBeta) return 'year'
    if (isBlumvox) return 'quarter'
    return parsed
  })

  useEffect(() => {
    if (isBeta) {
      setBillingInterval('year')
      return
    }
    if (isBlumvox) {
      setBillingInterval('quarter')
      return
    }
    if (intervalFromUrl) setBillingInterval(parseInterval(intervalFromUrl))
  }, [intervalFromUrl, isBlumvox, isBeta])

  const promoQuery = promoFromUrl
    ? `&promo=${encodeURIComponent(promoFromUrl)}`
    : ''

  return (
    <section id="pricing" className="section-pricing px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Affordable Plans for Every Stage of Your VO Career
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Whether you are just starting out or scaling a six-figure voice over business, there is a plan that fits.
          </p>
          {promoFromUrl && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm">
              <Badge variant="secondary" className="bg-accent/20">
                {isBeta ? 'Beta Tester' : isBlumvox ? 'BlumVox Student' : 'Promo'}
              </Badge>
              <span>
                Code <span className="font-mono font-semibold">{promoFromUrl.toUpperCase()}</span>
                {isBeta
                  ? ' — 50% off Momentum & Command (12-month annual prepay). Beta program terms apply at checkout.'
                  : isBlumvox
                    ? ' — 50% off Momentum & Command for an initial 3-month prepay. Complete Months 1–3 feedback to keep the discount month-to-month.'
                    : ' will be applied at checkout on eligible plans.'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {!isBeta && !isBlumvox && (
            <button
              onClick={() => setBillingInterval('month')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
          )}
          {isBlumvox && (
            <button
              onClick={() => setBillingInterval('quarter')}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'quarter'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              3-month prepay
            </button>
          )}
          {!isBlumvox && (
            <button
              onClick={() => setBillingInterval('year')}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'year'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Annual
              {!isBeta && (
                <span className="absolute -right-2 -top-2 rounded-full bg-artist-orange px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.15_0.06_285)]">
                  2 mo free
                </span>
              )}
            </button>
          )}
        </div>

        {isBeta && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Beta pricing is annual (12-month prepay) only. Complete Months 1–3 feedback for active beta participation.
          </p>
        )}

        {isBlumvox && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            BlumVox students start with a 3-month prepay at 50% off. Submit one feedback form each month; complete all three to keep the discount month-to-month afterward.
          </p>
        )}

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {PRODUCTS.map((product) => {
            const monthlyPrice = product.monthlyPriceInCents / 100
            const annualPrice = product.annualPriceInCents / 100
            const effectiveMonthly = getEffectiveMonthlyPrice(product) / 100
            const savings = monthlyPrice * 12 - annualPrice
            const marketingName = TIER_MARKETING_NAMES[product.tier]
            const checkoutHref = `/checkout/${product.id}?interval=${billingInterval}${promoQuery}`
            const listPrice = getProductPrice(product, billingInterval)
            const promoEligible =
              (isBlumvox || isBeta) &&
              (product.tier === 'momentum' || product.tier === 'command')
            const displayCents = promoEligible ? Math.round(listPrice * 0.5) : listPrice
            const promoDiscountLabel = isBeta ? 'Beta 50% off' : 'BlumVox 50% off'

            const tierTint =
              product.tier === 'launch'
                ? 'artist-card-teal'
                : product.tier === 'momentum'
                  ? 'artist-card-violet'
                  : 'artist-card-coral'

            return (
              <div
                key={product.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-8 transition-all',
                  tierTint,
                  product.highlighted
                    ? 'shadow-xl shadow-artist-coral/20 ring-1 ring-artist-coral'
                    : 'hover:shadow-lg',
                )}
              >
                {product.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-artist-coral px-4 py-1 text-xs font-semibold text-[oklch(0.15_0.06_285)]">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-card-foreground">{product.name}</h3>
                  {marketingName !== product.name && (
                    <p className="text-xs font-medium text-accent">{marketingName}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                </div>
                <div className="mb-6">
                  {billingInterval === 'month' ? (
                    <>
                      {promoEligible ? (
                        <>
                          <span className="mr-2 text-lg text-muted-foreground line-through">
                            ${monthlyPrice.toFixed(0)}
                          </span>
                          <span className="text-4xl font-bold text-card-foreground">
                            {formatCents(displayCents).replace('.00', '')}
                          </span>
                          <span className="text-muted-foreground">/mo</span>
                          <p className="mt-1 text-xs font-medium text-artist-green">{promoDiscountLabel}</p>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-card-foreground">
                            ${monthlyPrice.toFixed(0)}
                          </span>
                          <span className="text-muted-foreground">/mo</span>
                        </>
                      )}
                    </>
                  ) : billingInterval === 'quarter' ? (
                    <>
                      {promoEligible ? (
                        <>
                          <span className="mr-2 text-lg text-muted-foreground line-through">
                            {formatCents(listPrice).replace('.00', '')}
                          </span>
                          <span className="text-4xl font-bold text-card-foreground">
                            {formatCents(displayCents).replace('.00', '')}
                          </span>
                          <span className="text-muted-foreground">/3 mo</span>
                          <p className="mt-1 text-xs font-medium text-artist-green">
                            {promoDiscountLabel} · billed quarterly
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-card-foreground">
                            {formatCents(listPrice).replace('.00', '')}
                          </span>
                          <span className="text-muted-foreground">/3 mo</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {promoEligible ? (
                        <>
                          <span className="mr-2 text-lg text-muted-foreground line-through">
                            ${effectiveMonthly.toFixed(0)}
                          </span>
                          <span className="text-4xl font-bold text-card-foreground">
                            ${(displayCents / 100 / 12).toFixed(0)}
                          </span>
                          <span className="text-muted-foreground">/mo</span>
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className="text-sm text-muted-foreground">
                              <span className="line-through">${annualPrice.toFixed(0)}</span>{' '}
                              {formatCents(displayCents).replace('.00', '')} billed annually
                            </span>
                            <p className="text-xs font-medium text-artist-green">{promoDiscountLabel}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-card-foreground">
                            ${effectiveMonthly.toFixed(0)}
                          </span>
                          <span className="text-muted-foreground">/mo</span>
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className="text-sm text-muted-foreground">
                              ${annualPrice.toFixed(0)} billed annually
                            </span>
                            <span className="text-sm font-medium text-accent">
                              Save ${savings.toFixed(0)}/year
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <ul className="mb-8 flex flex-1 flex-col gap-3">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={product.highlighted ? 'success' : 'outline'}
                  asChild
                >
                  <Link href={checkoutHref}>
                    Get {product.name}
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
