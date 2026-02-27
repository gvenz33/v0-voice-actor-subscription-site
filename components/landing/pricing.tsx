import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'
import { cn } from '@/lib/utils'

export function Pricing() {
  return (
    <section id="pricing" className="bg-secondary px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Affordable Plans for Every Stage of Your VO Career
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Whether you are just starting out or scaling a six-figure voice over business, there is a plan that fits.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {PRODUCTS.map((product) => (
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
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-card-foreground">{product.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-card-foreground">
                  ${(product.priceInCents / 100).toFixed(0)}
                </span>
                <span className="text-muted-foreground">/mo</span>
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
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : '',
                )}
                variant={product.highlighted ? 'default' : 'outline'}
                asChild
              >
                <Link href={`/checkout/${product.id}`}>
                  Get {product.name}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
