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
    monthlyPriceInCents: 2900,
    annualPriceInCents: 29000, // $290/yr ($24.17/mo effective)
    tier: 'launch',
    features: [
      'Up to 50 contacts in Client Hub',
      'Submission & audition tracking',
      'Basic booking management',
      'Simple invoice generation',
      'Action items & task list',
      'AI outreach email writer (20/mo)',
      '50 MB media storage (demos, resume, files)',
      'Brand voice for AI messages',
      'Prospect Finder (20 scans/mo)',
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
      '2 GB media storage (demos, resume, repository)',
      'Brand voice for AI emails & pitches',
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
      '10 GB media storage (demos, resume, repository)',
      'Brand voice for all AI-generated copy',
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

export type BillingInterval = 'month' | 'year' | 'quarter'

/** 3-month prepay = 3 × monthly list price (before promo). */
export function getQuarterPriceInCents(product: Product) {
  return product.monthlyPriceInCents * 3
}

// Helper to get price based on billing interval
export function getProductPrice(product: Product, interval: BillingInterval) {
  if (interval === 'year') return product.annualPriceInCents
  if (interval === 'quarter') return getQuarterPriceInCents(product)
  return product.monthlyPriceInCents
}

// Helper to get effective monthly price for annual plans
export function getEffectiveMonthlyPrice(product: Product) {
  return Math.round(product.annualPriceInCents / 12)
}

export function billingIntervalLabel(interval: BillingInterval): string {
  if (interval === 'year') return 'Annual'
  if (interval === 'quarter') return '3-month prepay'
  return 'Monthly'
}
