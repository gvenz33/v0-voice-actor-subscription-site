/** Client-safe Stripe publishable key helpers (no secrets). */

export function getStripePublishableKey(): string | undefined {
  const voKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_VO?.trim()
  if (voKey) return voKey
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || undefined
}
