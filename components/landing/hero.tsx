import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart3, Users, Send } from 'lucide-react'

export function Hero() {
  return (
    <section className="section-hero relative overflow-hidden px-6 py-24 md:py-32">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-[oklch(0.50_0.22_295)] opacity-20 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 h-56 w-56 rounded-full bg-[oklch(0.50_0.18_265)] opacity-15 blur-[80px]" />
        <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-[oklch(0.45_0.15_240)] opacity-10 blur-[60px]" />
      </div>
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/10 px-4 py-1.5">
          <span className="text-xs font-medium text-foreground/80">Built for Voice Actors</span>
        </div>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Build Your Voiceover Career{' '}
          <span className="bg-gradient-to-r from-[oklch(0.70_0.22_295)] to-[oklch(0.65_0.18_265)] bg-clip-text text-transparent">Like a Business</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-foreground/70 md:text-xl">
          The all-in-one CRM and business management platform designed exclusively for voice actors.
          Track submissions, manage clients, send invoices, and scale your career with confidence.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90 shadow-lg shadow-[oklch(0.50_0.22_295_/_0.25)]" asChild>
            <Link href="/auth/sign-up">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-foreground/20 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground" asChild>
            <Link href="#pricing">View Pricing</Link>
          </Button>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 p-6 backdrop-blur-sm">
            <Users className="h-8 w-8 text-[oklch(0.70_0.22_295)]" />
            <span className="text-2xl font-bold text-foreground">CRM</span>
            <span className="text-sm text-foreground/60">Client Management</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 p-6 backdrop-blur-sm">
            <Send className="h-8 w-8 text-[oklch(0.65_0.18_265)]" />
            <span className="text-2xl font-bold text-foreground">Pipeline</span>
            <span className="text-sm text-foreground/60">Submission Tracking</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 p-6 backdrop-blur-sm">
            <BarChart3 className="h-8 w-8 text-[oklch(0.60_0.16_240)]" />
            <span className="text-2xl font-bold text-foreground">Analytics</span>
            <span className="text-sm text-foreground/60">Revenue Insights</span>
          </div>
        </div>
      </div>
    </section>
  )
}
