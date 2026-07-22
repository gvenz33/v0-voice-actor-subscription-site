import "server-only"

import Stripe from "stripe"

const API_VERSION = "2025-02-24.acacia" as const

let stripeSingleton: Stripe | null = null
let stripeSingletonKey: string | null = null

/** VO Biz Suite Stripe account — preferred when set in Vercel. */
export function getStripeSecretKey(): string | undefined {
  const voKey = process.env.STRIPE_SECRET_KEY_VO?.trim()
  if (voKey) return voKey
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined
}

export function getStripeKeySource(): "vo" | "legacy" | "none" {
  const voKey = process.env.STRIPE_SECRET_KEY_VO?.trim()
  if (voKey) return "vo"
  if (process.env.STRIPE_SECRET_KEY?.trim()) return "legacy"
  return "none"
}

export function getStripeMode(key = getStripeSecretKey()): "test" | "live" | "unknown" {
  if (!key) return "unknown"
  if (key.startsWith("sk_live")) return "live"
  if (key.startsWith("sk_test")) return "test"
  return "unknown"
}

/** Lazy Stripe client so route modules can load during `next build` without a secret key. */
export function getStripe(): Stripe {
  const key = getStripeSecretKey()
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY_VO or STRIPE_SECRET_KEY is not configured")
  }
  if (!stripeSingleton || stripeSingletonKey !== key) {
    stripeSingleton = new Stripe(key, { apiVersion: API_VERSION })
    stripeSingletonKey = key
  }
  return stripeSingleton
}
