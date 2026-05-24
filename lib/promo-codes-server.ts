import { createClient } from "@/lib/supabase/server"
import {
  normalizePromoCode,
  type PromoCodeRecord,
  type PromoValidationResult,
  validatePromoForCheckout,
  type SubscriptionTierId,
} from "@/lib/promo-codes"
import { getProductPrice, PRODUCTS } from "@/lib/products"

export async function fetchPromoCodeByCode(code: string): Promise<PromoCodeRecord | null> {
  const normalized = normalizePromoCode(code)
  if (!normalized) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle()

  if (error || !data) return null
  return data as PromoCodeRecord
}

export async function validatePromoCodeForCheckout(
  code: string,
  productId: string,
  interval: "month" | "year"
): Promise<PromoValidationResult> {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    return { valid: false, error: "Invalid product." }
  }

  const promo = await fetchPromoCodeByCode(code)
  if (!promo) {
    return { valid: false, error: "Invalid promo code." }
  }

  const priceInCents = getProductPrice(product, interval)
  return validatePromoForCheckout(promo, product.tier as SubscriptionTierId, interval, priceInCents)
}

export async function recordPromoRedemption(input: {
  promoCodeId: string
  userId?: string | null
  stripeSessionId?: string | null
  tier?: string | null
  billingInterval?: string | null
  discountAppliedCents?: number
}): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("record_promo_redemption", {
    p_promo_id: input.promoCodeId,
    p_user_id: input.userId ?? null,
    p_stripe_session_id: input.stripeSessionId ?? null,
    p_tier: input.tier ?? null,
    p_billing_interval: input.billingInterval ?? null,
    p_discount_applied_cents: input.discountAppliedCents ?? 0,
  })

  if (error || !data) {
    console.error("[promo] record redemption failed:", error)
    return false
  }

  return true
}

export type PromoCodeInput = {
  code: string
  description?: string | null
  discount_type: "percent" | "fixed"
  discount_value: number
  applies_to_tiers?: string[]
  billing_interval_restriction?: "month" | "year" | "any"
  requires_feedback_acknowledgement?: boolean
  max_redemptions?: number | null
  valid_from?: string | null
  valid_until?: string | null
  active?: boolean
}

export async function listPromoCodesAdmin(): Promise<PromoCodeRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data as PromoCodeRecord[]) ?? []
}

export async function createPromoCodeAdmin(input: PromoCodeInput): Promise<PromoCodeRecord> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: normalizePromoCode(input.code),
      description: input.description ?? null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      applies_to_tiers: input.applies_to_tiers ?? [],
      billing_interval_restriction: input.billing_interval_restriction ?? "any",
      requires_feedback_acknowledgement: input.requires_feedback_acknowledgement ?? false,
      max_redemptions: input.max_redemptions ?? null,
      valid_from: input.valid_from ?? new Date().toISOString(),
      valid_until: input.valid_until ?? null,
      active: input.active ?? true,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as PromoCodeRecord
}

export async function updatePromoCodeAdmin(
  id: string,
  input: Partial<PromoCodeInput>
): Promise<PromoCodeRecord> {
  const supabase = await createClient()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.code !== undefined) payload.code = normalizePromoCode(input.code)
  if (input.description !== undefined) payload.description = input.description
  if (input.discount_type !== undefined) payload.discount_type = input.discount_type
  if (input.discount_value !== undefined) payload.discount_value = input.discount_value
  if (input.applies_to_tiers !== undefined) payload.applies_to_tiers = input.applies_to_tiers
  if (input.billing_interval_restriction !== undefined) {
    payload.billing_interval_restriction = input.billing_interval_restriction
  }
  if (input.requires_feedback_acknowledgement !== undefined) {
    payload.requires_feedback_acknowledgement = input.requires_feedback_acknowledgement
  }
  if (input.max_redemptions !== undefined) payload.max_redemptions = input.max_redemptions
  if (input.valid_from !== undefined) payload.valid_from = input.valid_from
  if (input.valid_until !== undefined) payload.valid_until = input.valid_until
  if (input.active !== undefined) payload.active = input.active

  const { data, error } = await supabase
    .from("promo_codes")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as PromoCodeRecord
}

export async function deletePromoCodeAdmin(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("promo_codes").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
