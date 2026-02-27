import {
  Users,
  Send,
  Briefcase,
  Receipt,
  MessageSquare,
  CheckSquare,
  Mail,
  BarChart3,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Client Hub',
    description: 'Your full CRM for production companies, studios, ad agencies, and direct clients. Track every relationship in one place.',
  },
  {
    icon: Send,
    title: 'Submissions',
    description: 'Log every audition and demo you send out. Track status from submitted to callback to booked.',
  },
  {
    icon: Briefcase,
    title: 'Bookings',
    description: 'Manage confirmed gigs with session dates, rates, usage rights, and delivery status all organized.',
  },
  {
    icon: Receipt,
    title: 'Billing Desk',
    description: 'Generate and track invoices tied to your bookings. Know exactly what is paid, pending, or overdue.',
  },
  {
    icon: MessageSquare,
    title: 'Touchpoints',
    description: 'Log every outreach email, call, and follow-up. Never let a warm lead go cold again.',
  },
  {
    icon: CheckSquare,
    title: 'Action Items',
    description: 'Your VO-specific task list with priorities and due dates. Stay on top of your business to-dos.',
  },
  {
    icon: Mail,
    title: 'Email Campaigns',
    description: 'Craft and schedule outreach emails to prospects. Build templates for pitches and follow-ups.',
  },
  {
    icon: BarChart3,
    title: 'Command Center',
    description: 'Your business dashboard at a glance. See submissions, revenue, bookings, and follow-ups in real time.',
  },
]

export function Features() {
  return (
    <section id="features" className="px-6 py-24 md:py-32">
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
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-accent/50 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <feature.icon className="h-6 w-6 text-accent" />
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
