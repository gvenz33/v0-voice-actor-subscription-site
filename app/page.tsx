import { Suspense } from 'react'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { CTA } from '@/components/landing/cta'
import { FAQ } from '@/components/landing/faq'
import { Footer } from '@/components/landing/footer'
import { buildHomeJsonLd } from '@/lib/seo/json-ld'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

export default function HomePage() {
  const jsonLd = buildHomeJsonLd()

  return (
    <div className="min-h-svh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Suspense fallback={null}>
          <Pricing />
        </Suspense>
        <CTA />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
