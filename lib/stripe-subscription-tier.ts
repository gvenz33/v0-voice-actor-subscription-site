import type { SubscriptionTier } from "@/lib/ai-limits"
import { PRODUCTS } from "@/lib/products"
import type Stripe from "stripe"

/** Map checkout metadata product_id to subscription tier */
export function tierFromProductId(productId: string | null | undefined): SubscriptionTier | null {
  if (!productId) return null
  const product = PRODUCTS.find((p) => p.id === productId)
  return product?.tier ?? null
}

/** Map Stripe subscription line items to tier via metadata or product name */
export function tierFromStripeSubscription(
  subscription: Stripe.Subscription
): SubscriptionTier | null {
  const metaTier = subscription.metadata?.tier
  if (
    metaTier === "launch" ||
    metaTier === "momentum" ||
    metaTier === "command"
  ) {
    return metaTier
  }

  const productId = subscription.metadata?.product_id
  const fromProduct = tierFromProductId(productId)
  if (fromProduct) return fromProduct

  const item = subscription.items?.data?.[0]
  if (!item) return null

  const price = item.price
  if (price?.metadata?.tier) {
    const t = price.metadata.tier
    if (t === "launch" || t === "momentum" || t === "command") return t
  }

  const product = price?.product
  if (typeof product === "object" && product !== null && "metadata" in product) {
    const pt = (product as Stripe.Product).metadata?.tier
    if (pt === "launch" || pt === "momentum" || pt === "command") return pt
  }

  const name =
    (typeof product === "object" && product !== null && "name" in product
      ? (product as Stripe.Product).name
      : null) ?? ""

  const lower = name.toLowerCase()
  if (lower.includes("command")) return "command"
  if (lower.includes("momentum")) return "momentum"
  if (lower.includes("launch")) return "launch"

  return null
}

export function tierForActiveSubscription(
  subscription: Stripe.Subscription
): SubscriptionTier {
  const status = subscription.status
  if (status === "active" || status === "trialing" || status === "past_due") {
    return tierFromStripeSubscription(subscription) ?? "free"
  }
  return "free"
}
