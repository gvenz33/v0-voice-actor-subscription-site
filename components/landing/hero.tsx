import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart3, Users, Send } from 'lucide-react'

export function Hero() {
  return (
    <section className="section-hero relative overflow-hidden px-6 py-24 md:py-32">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-artist-violet opacity-40 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 h-56 w-56 rounded-full bg-artist-indigo opacity-32 blur-[80px]" />
        <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-artist-green opacity-28 blur-[60px]" />
        <div className="absolute bottom-1/4 left-1/3 h-36 w-36 rounded-full bg-artist-orange opacity-22 blur-[70px]" />
        <div className="absolute top-1/3 right-1/5 h-28 w-28 rounded-full bg-artist-yellow opacity-20 blur-[50px]" />
      </div>
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-10 flex justify-center">
          <Image
            src="/images/vobizsuite-hero-transparent.png"
            alt="VOBizSuite"
            width={700}
            height={200}
            className="h-28 w-auto md:h-36 lg:h-44"
            priority
          />
        </div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-artist-violet/30 bg-artist-violet/10 px-4 py-1.5">
          <span className="text-xs font-medium text-foreground/80">Built for Voice Actors</span>
        </div>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Build Your Voiceover Career{' '}
          <span className="bg-gradient-to-r from-artist-violet via-artist-indigo to-artist-teal bg-clip-text text-transparent">
            Like a Business
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-foreground/70 md:text-xl">
          The all-in-one CRM and business management platform designed exclusively for voice actors.
          Track submissions, manage clients, send invoices, and scale your career with confidence.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            variant="success"
            className="shadow-lg shadow-artist-green/30"
            asChild
          >
            <Link href="/auth/sign-up">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-foreground/20 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground"
            asChild
          >
            <Link href="#pricing">View Pricing</Link>
          </Button>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="artist-card-violet flex flex-col items-center gap-2 rounded-xl border p-6 backdrop-blur-sm">
            <Users className="h-8 w-8 text-artist-violet" />
            <span className="text-2xl font-bold text-foreground">CRM</span>
            <span className="text-sm text-foreground/60">Manage every client relationship</span>
          </div>
          <div className="artist-card-coral flex flex-col items-center gap-2 rounded-xl border p-6 backdrop-blur-sm">
            <Send className="h-8 w-8 text-artist-coral" />
            <span className="text-2xl font-bold text-foreground">Pipeline</span>
            <span className="text-sm text-foreground/60">Track auditions to bookings</span>
          </div>
          <div className="artist-card-teal flex flex-col items-center gap-2 rounded-xl border p-6 backdrop-blur-sm">
            <BarChart3 className="h-8 w-8 text-artist-teal" />
            <span className="text-2xl font-bold text-foreground">Growth</span>
            <span className="text-sm text-foreground/60">Invoice, analyze, scale</span>
          </div>
        </div>
      </div>
    </section>
  )
}
