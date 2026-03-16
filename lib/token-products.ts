export interface TokenPackage {
  id: string
  name: string
  description: string
  tokens: number
  priceInCents: number
  popular?: boolean
}

// Token costs per operation
export const TOKEN_COSTS = {
  EMAIL_GENERATION: 5,
  PITCH_GENERATION: 5,
  FOLLOWUP_GENERATION: 5,
  WEB_RESEARCH: 15,
  CHAT_MESSAGE: 2,
  SEND_EMAIL: 1,
} as const

// Token packages available for purchase
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'tokens-starter',
    name: 'Starter',
    description: '100 tokens - Great for trying it out',
    tokens: 100,
    priceInCents: 499, // $4.99
  },
  {
    id: 'tokens-growth',
    name: 'Growth',
    description: '500 tokens - Best value for regular users',
    tokens: 500,
    priceInCents: 1499, // $14.99
    popular: true,
  },
  {
    id: 'tokens-pro',
    name: 'Pro',
    description: '1,500 tokens - For power users',
    tokens: 1500,
    priceInCents: 3499, // $34.99
  },
]

// Helper to format price
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// Helper to calculate per-token cost
export function pricePerToken(pkg: TokenPackage): string {
  return `$${(pkg.priceInCents / 100 / pkg.tokens).toFixed(3)}`
}

// Helper to estimate what you can do with tokens
export function getTokenEstimate(tokens: number) {
  return {
    emails: Math.floor(tokens / TOKEN_COSTS.EMAIL_GENERATION),
    research: Math.floor(tokens / TOKEN_COSTS.WEB_RESEARCH),
    chatMessages: Math.floor(tokens / TOKEN_COSTS.CHAT_MESSAGE),
    sends: Math.floor(tokens / TOKEN_COSTS.SEND_EMAIL),
  }
}
