import { PRODUCTS, getProductPrice } from '@/lib/products'
import { notFound } from 'next/navigation'
import Checkout from '@/components/checkout'
import { Mic, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ interval?: string }>
}) {
  const { productId } = await params
  const { interval } = await searchParams
  const billingInterval = interval === 'year' ? 'year' : 'month'
  
  const product = PRODUCTS.find((p) => p.id === productId)

  if (!product) {
    notFound()
  }

  const priceInCents = getProductPrice(product, billingInterval)
  const displayPrice = billingInterval === 'year' 
    ? `$${(priceInCents / 100).toFixed(0)}/year`
    : `$${(priceInCents / 100).toFixed(0)}/month`

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
          {billingInterval === 'year' && (
            <p className="mt-1 text-sm text-accent font-medium">
              2 months free with annual billing
            </p>
          )}
        </div>
        <Checkout productId={productId} billingInterval={billingInterval} />
      </div>
    </div>
  )
}
