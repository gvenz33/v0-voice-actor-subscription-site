import { Suspense } from 'react'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { CTA } from '@/components/landing/cta'
import { FAQ } from '@/components/landing/faq'
import { Footer } from '@/components/landing/footer'
import type { Metadata } from 'next'

const siteUrl = 'https://vobizsuite.io'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VO Biz Suite',
    url: siteUrl,
    description:
      'The all-in-one CRM and business management platform built for voice actors.',
    sameAs: ['https://x.com/vobizsuite'],
  }

  return (
    <div className="min-h-svh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <div className="sr-only">Deploy check: 2026-04-01</div>
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
