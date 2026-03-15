export interface Product {
  id: string
  name: string
  description: string
  monthlyPriceInCents: number
  annualPriceInCents: number
  features: string[]
  tier: 'launch' | 'momentum' | 'command'
  highlighted?: boolean
}

// Annual pricing = 10 months (2 months free, ~17% discount)
export const PRODUCTS: Product[] = [
  {
    id: 'launch',
    name: 'Launch',
    description: 'For voice actors just getting started in the business',
    monthlyPriceInCents: 1900,
    annualPriceInCents: 19000, // $190/yr ($15.83/mo effective)
    tier: 'launch',
    features: [
      'Up to 50 contacts in Client Hub',
      'Submission & audition tracking',
      'Basic booking management',
      'Simple invoice generation',
      'Action items & task list',
      'AI outreach email writer (5/mo)',
      'Prospect Finder (5 scans/mo)',
      'Email support',
    ],
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'For growing voice actors scaling their outreach',
    monthlyPriceInCents: 4900,
    annualPriceInCents: 49000, // $490/yr ($40.83/mo effective)
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
      'Prospect Finder (50 scans/mo)',
      'AI follow-up writer',
      'Performance analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'command',
    name: 'Command',
    description: 'For professional voice actors running a full business',
    monthlyPriceInCents: 9900,
    annualPriceInCents: 99000, // $990/yr ($82.50/mo effective)
    tier: 'command',
    features: [
      'Everything in Momentum',
      'Unlimited everything',
      'Advanced CRM with pipeline automation',
      'Unlimited AI outreach, pitches & assistant',
      'Unlimited Prospect Finder scans',
      'AI VO Business Assistant (chat)',
      'Custom invoice branding',
      'Calendar integrations',
      'API access for custom workflows',
      'Dedicated account support',
      'Early access to new features',
    ],
  },
]

// Helper to get price based on billing interval
export function getProductPrice(product: Product, interval: 'month' | 'year') {
  return interval === 'year' ? product.annualPriceInCents : product.monthlyPriceInCents
}

// Helper to get effective monthly price for annual plans
export function getEffectiveMonthlyPrice(product: Product) {
  return Math.round(product.annualPriceInCents / 12)
}
