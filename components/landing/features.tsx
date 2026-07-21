import {
  Users,
  Send,
  Briefcase,
  Receipt,
  MessageSquare,
  CheckSquare,
  Sparkles,
  ScanSearch,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: ScanSearch,
    title: 'Prospect Finder',
    description: 'Search for production companies, studios, and agencies. AI scans their websites and extracts emails, names, and roles so you can start pitching.',
    tint: 'artist-card-teal',
    iconWell: 'bg-artist-teal/15 text-artist-teal',
  },
  {
    icon: Sparkles,
    title: 'AI Outreach Writer',
    description: 'Generate compelling cold emails, follow-ups, and elevator pitches with AI trained on voice over industry best practices.',
    tint: 'artist-card-violet',
    iconWell: 'bg-artist-violet/15 text-artist-violet',
  },
  {
    icon: Users,
    title: 'Client Hub',
    description: 'Your full CRM for production companies, studios, ad agencies, and direct clients. Track every relationship in one place.',
    tint: 'artist-card-indigo',
    iconWell: 'bg-artist-indigo/15 text-artist-indigo',
  },
  {
    icon: Send,
    title: 'Submissions',
    description: 'Log every audition and demo you send out. Track status from submitted to callback to booked.',
    tint: 'artist-card-coral',
    iconWell: 'bg-artist-coral/15 text-artist-coral',
  },
  {
    icon: Briefcase,
    title: 'Bookings',
    description: 'Manage confirmed gigs with session dates, rates, usage rights, and delivery status all organized.',
    tint: 'artist-card-amber',
    iconWell: 'bg-artist-amber/15 text-artist-amber',
  },
  {
    icon: Receipt,
    title: 'Billing Desk',
    description: 'Generate and track invoices tied to your bookings. Know exactly what is paid, pending, or overdue.',
    tint: 'artist-card-rose',
    iconWell: 'bg-artist-rose/15 text-artist-rose',
  },
  {
    icon: MessageSquare,
    title: 'Touchpoints',
    description: 'Log every outreach email, call, and follow-up. Never let a warm lead go cold again.',
    tint: 'artist-card-teal',
    iconWell: 'bg-artist-teal/15 text-artist-teal',
  },
  {
    icon: CheckSquare,
    title: 'Action Items',
    description: 'Your VO-specific task list with priorities and due dates. Stay on top of your business to-dos.',
    tint: 'artist-card-coral',
    iconWell: 'bg-artist-coral/15 text-artist-coral',
  },
  {
    icon: BarChart3,
    title: 'Command Center',
    description: 'Your business dashboard at a glance. See submissions, revenue, bookings, and follow-ups in real time.',
    tint: 'artist-card-violet',
    iconWell: 'bg-artist-violet/15 text-artist-violet',
  },
]

export function Features() {
  return (
    <section id="features" className="section-features px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Everything You Need to Run Your VO Business
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Stop juggling spreadsheets and sticky notes. VO Biz Suite brings your entire voice over business into one powerful platform.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={cn(
                'group rounded-xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                feature.tint,
              )}
            >
              <div
                className={cn(
                  'mb-4 flex h-12 w-12 items-center justify-center rounded-lg',
                  feature.iconWell,
                )}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
