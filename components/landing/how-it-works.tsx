import { UserPlus, Rocket, TrendingUp } from 'lucide-react'

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Create Your Account',
    description: 'Sign up in seconds. Choose the plan that matches where you are in your VO career.',
  },
  {
    icon: Rocket,
    step: '02',
    title: 'Set Up Your Pipeline',
    description: 'Import your contacts, log your first submissions, and set up your outreach templates.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Grow Your Business',
    description: 'Track every audition, follow up on time, invoice clients, and watch your VO career take off.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-how px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Get Up and Running in Minutes
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            No complicated setup. No steep learning curve. Just a platform that works the way voice actors do.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="relative text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <step.icon className="h-8 w-8 text-accent" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
                Step {step.step}
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
