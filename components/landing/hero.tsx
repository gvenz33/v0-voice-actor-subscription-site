import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart3, Users, Send } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary px-6 py-24 md:py-32">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-accent blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5">
          <span className="text-xs font-medium text-primary-foreground/80">Built for Independent Voice Actors</span>
        </div>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
          Build Your Voiceover Career{' '}
          <span className="text-accent">Like a Business</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-primary-foreground/70 md:text-xl">
          The all-in-one CRM and business management platform designed exclusively for voice actors.
          Track submissions, manage clients, send invoices, and scale your career with confidence.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="/auth/sign-up">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
            <Link href="#pricing">View Pricing</Link>
          </Button>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-primary-foreground/5 p-6">
            <Users className="h-8 w-8 text-accent" />
            <span className="text-2xl font-bold text-primary-foreground">CRM</span>
            <span className="text-sm text-primary-foreground/60">Client Management</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl bg-primary-foreground/5 p-6">
            <Send className="h-8 w-8 text-accent" />
            <span className="text-2xl font-bold text-primary-foreground">Pipeline</span>
            <span className="text-sm text-primary-foreground/60">Submission Tracking</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl bg-primary-foreground/5 p-6">
            <BarChart3 className="h-8 w-8 text-accent" />
            <span className="text-2xl font-bold text-primary-foreground">Analytics</span>
            <span className="text-sm text-primary-foreground/60">Revenue Insights</span>
          </div>
        </div>
      </div>
    </section>
  )
}
