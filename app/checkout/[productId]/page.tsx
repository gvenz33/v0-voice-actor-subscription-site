import { PRODUCTS, getProductPrice, billingIntervalLabel, type BillingInterval } from '@/lib/products'
import { notFound, redirect } from 'next/navigation'
import CheckoutFlow from '@/components/checkout-flow'
import { Mic, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { validatePromoCodeForCheckout } from '@/lib/promo-codes-server'
import { formatCents } from '@/lib/promo-codes'

function parseInterval(raw?: string): BillingInterval {
  if (raw === 'year') return 'year'
  if (raw === 'quarter') return 'quarter'
  return 'month'
}

function priceSuffix(interval: BillingInterval): string {
  if (interval === 'year') return 'year'
  if (interval === 'quarter') return '3 months'
  return 'month'
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ interval?: string; promo?: string }>
}) {
  const { productId } = await params
  const { interval, promo } = await searchParams

  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    notFound()
  }

  let billingInterval = parseInterval(interval)
  const initialPromoCode = promo?.trim() ?? ''

  if (initialPromoCode) {
    const validation = await validatePromoCodeForCheckout(
      initialPromoCode,
      productId,
      billingInterval
    )

    if (
      validation.valid &&
      validation.promo?.billing_interval_restriction === 'year' &&
      billingInterval !== 'year'
    ) {
      redirect(`/checkout/${productId}?interval=year&promo=${encodeURIComponent(initialPromoCode)}`)
    }

    if (
      validation.valid === false &&
      billingInterval === 'year' &&
      initialPromoCode.toUpperCase() === 'BLUMVOX'
    ) {
      redirect(`/checkout/${productId}?interval=month&promo=${encodeURIComponent(initialPromoCode)}`)
    }
  }

  const priceInCents = getProductPrice(product, billingInterval)
  let displayPrice = `${formatCents(priceInCents)}/${priceSuffix(billingInterval)}`
  let promoNote: string | null = null

  if (initialPromoCode) {
    const validation = await validatePromoCodeForCheckout(
      initialPromoCode,
      productId,
      billingInterval
    )
    if (validation.valid && validation.discountedPriceInCents != null) {
      displayPrice = `${formatCents(validation.discountedPriceInCents)}/${priceSuffix(billingInterval)}`
      promoNote = `Promo ${validation.promo?.code} applied at checkout`
    }
  }

  return (
    <div className="min-h-svh bg-secondary">
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Mic className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">VO Biz Suite</span>
          </Link>
          <Link href="/#pricing" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Subscribe to {product.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {product.description} &mdash; {displayPrice}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Billing: {billingIntervalLabel(billingInterval)}
          </p>
          {billingInterval === 'year' && (
            <p className="mt-1 text-sm font-medium text-accent">
              2 months free with annual billing
            </p>
          )}
          {billingInterval === 'quarter' && (
            <p className="mt-1 text-sm font-medium text-accent">
              Pay for 3 months upfront — billed every quarter
            </p>
          )}
          {promoNote && (
            <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
              {promoNote}
            </p>
          )}
        </div>
        <CheckoutFlow
          productId={productId}
          billingInterval={billingInterval}
          initialPromoCode={initialPromoCode}
        />
      </div>
    </div>
  )
}
