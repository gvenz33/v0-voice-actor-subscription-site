import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { CTA } from '@/components/landing/cta'
import { FAQ } from '@/components/landing/faq'
import { Footer } from '@/components/landing/footer'

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
