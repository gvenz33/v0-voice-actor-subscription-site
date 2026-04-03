import "server-only"

import Stripe from "stripe"

const API_VERSION = "2025-02-24.acacia" as const

let stripeSingleton: Stripe | null = null

/** Lazy Stripe client so route modules can load during `next build` without STRIPE_SECRET_KEY. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, { apiVersion: API_VERSION })
  }
  return stripeSingleton
}
