'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { PRODUCTS, getEffectiveMonthlyPrice } from '@/lib/products'
import { cn } from '@/lib/utils'

export function Pricing() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

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
        </div>

        {/* Billing Toggle */}
        <div className="mt-10 flex items-center justify-center gap-4">
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
            <span className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] px-2 py-0.5 text-[10px] font-semibold text-foreground">
              2 mo free
            </span>
          </button>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {PRODUCTS.map((product) => {
            const monthlyPrice = product.monthlyPriceInCents / 100
            const annualPrice = product.annualPriceInCents / 100
            const effectiveMonthly = getEffectiveMonthlyPrice(product) / 100
            const savings = (monthlyPrice * 12) - annualPrice

            return (
              <div
                key={product.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-card p-8 transition-all',
                  product.highlighted
                    ? 'border-accent shadow-xl shadow-accent/10 ring-1 ring-accent'
                    : 'border-border hover:border-accent/30 hover:shadow-lg',
                )}
              >
                {product.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] px-4 py-1 text-xs font-semibold text-foreground">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-card-foreground">{product.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                </div>
                <div className="mb-6">
                  {billingInterval === 'month' ? (
                    <>
                      <span className="text-4xl font-bold text-card-foreground">
                        ${monthlyPrice.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">/mo</span>
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
                  className={cn(
                    'w-full',
                    product.highlighted
                      ? 'bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90 border-0'
                      : '',
                  )}
                  variant={product.highlighted ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={`/checkout/${product.id}?interval=${billingInterval}`}>
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
