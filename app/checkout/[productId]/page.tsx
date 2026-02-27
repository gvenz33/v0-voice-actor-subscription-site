import { PRODUCTS } from '@/lib/products'
import { notFound } from 'next/navigation'
import Checkout from '@/components/checkout'
import { Mic, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const product = PRODUCTS.find((p) => p.id === productId)

  if (!product) {
    notFound()
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
            {product.description} &mdash; ${(product.priceInCents / 100).toFixed(0)}/month
          </p>
        </div>
        <Checkout productId={productId} />
      </div>
    </div>
  )
}
