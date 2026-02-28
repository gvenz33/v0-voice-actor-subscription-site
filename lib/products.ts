export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: 'month'
  features: string[]
  tier: 'launch' | 'momentum' | 'command'
  highlighted?: boolean
}

export const PRODUCTS: Product[] = [
  {
    id: 'launch',
    name: 'Launch',
    description: 'For voice actors just getting started in the business',
    priceInCents: 1900,
    interval: 'month',
    tier: 'launch',
    features: [
      'Up to 50 contacts in Client Hub',
      'Submission & audition tracking',
      'Basic booking management',
      'Simple invoice generation',
      'Action items & task list',
      'AI outreach email writer (5/mo)',
      'Email support',
    ],
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'For growing voice actors scaling their outreach',
    priceInCents: 4900,
    interval: 'month',
    tier: 'momentum',
    highlighted: true,
    features: [
      'Unlimited contacts in Client Hub',
      'Advanced submission pipeline',
      'Full booking & session management',
      'Professional invoicing with tracking',
      'Touchpoint & follow-up automation',
      'Action items with priority levels',
      'AI outreach emails & pitch generator (50/mo)',
      'AI follow-up writer',
      'Performance analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'command',
    name: 'Command',
    description: 'For professional voice actors running a full business',
    priceInCents: 9900,
    interval: 'month',
    tier: 'command',
    features: [
      'Everything in Momentum',
      'Unlimited everything',
      'Advanced CRM with pipeline automation',
      'Unlimited AI outreach, pitches & assistant',
      'AI VO Business Assistant (chat)',
      'Custom invoice branding',
      'Calendar integrations',
      'API access for custom workflows',
      'Dedicated account support',
      'Early access to new features',
    ],
  },
]
