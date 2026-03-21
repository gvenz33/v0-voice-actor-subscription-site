import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="section-cta relative overflow-hidden px-6 py-24 md:py-32">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.45_0.22_295)] opacity-15 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Ready to Run Your VO Career Like a Real Business?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-foreground/70">
          Join hundreds of voice actors who are using VO Biz Suite to organize, grow, and thrive.
        </p>
        <div className="mt-8">
          <Button size="lg" className="bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90 shadow-lg shadow-[oklch(0.50_0.22_295_/_0.25)]" asChild>
            <Link href="/auth/sign-up">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
    
  )
}
