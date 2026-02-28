import { createClient } from "@/lib/supabase/server"

export type SubscriptionTier = "free" | "launch" | "momentum" | "command"

export interface TierLimits {
  monthlyGenerations: number // 0 = no access, -1 = unlimited
  hasFollowUpWriter: boolean
  hasPitchGenerator: boolean
  hasChatAssistant: boolean
  label: string
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    monthlyGenerations: 0,
    hasFollowUpWriter: false,
    hasPitchGenerator: false,
    hasChatAssistant: false,
    label: "Free",
  },
  launch: {
    monthlyGenerations: 5,
    hasFollowUpWriter: false,
    hasPitchGenerator: false,
    hasChatAssistant: false,
    label: "Launch",
  },
  momentum: {
    monthlyGenerations: 50,
    hasFollowUpWriter: true,
    hasPitchGenerator: true,
    hasChatAssistant: false,
    label: "Momentum",
  },
  command: {
    monthlyGenerations: -1, // unlimited
    hasFollowUpWriter: true,
    hasPitchGenerator: true,
    hasChatAssistant: true,
    label: "Command",
  },
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export async function getUserAIAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's subscription tier from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single()

  const tier = (profile?.subscription_tier || "free") as SubscriptionTier
  const limits = TIER_LIMITS[tier]
  const currentMonth = getCurrentMonth()

  // Get or create usage record for this month
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("generation_count")
    .eq("user_id", user.id)
    .eq("usage_month", currentMonth)
    .single()

  const generationCount = usage?.generation_count || 0

  const isUnlimited = limits.monthlyGenerations === -1
  const remainingGenerations = isUnlimited
    ? Infinity
    : Math.max(0, limits.monthlyGenerations - generationCount)
  const canGenerate =
    limits.monthlyGenerations !== 0 && (isUnlimited || remainingGenerations > 0)

  return {
    userId: user.id,
    tier,
    limits,
    generationCount,
    remainingGenerations,
    canGenerate,
    isUnlimited,
    currentMonth,
  }
}

export async function incrementUsage(userId: string) {
  const supabase = await createClient()
  const currentMonth = getCurrentMonth()

  // Upsert: insert if no row exists, otherwise increment
  const { data: existing } = await supabase
    .from("ai_usage")
    .select("id, generation_count")
    .eq("user_id", userId)
    .eq("usage_month", currentMonth)
    .single()

  if (existing) {
    await supabase
      .from("ai_usage")
      .update({
        generation_count: existing.generation_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await supabase.from("ai_usage").insert({
      user_id: userId,
      usage_month: currentMonth,
      generation_count: 1,
    })
  }
}
