import { createClient } from "@/lib/supabase/server"
import { TOKEN_COSTS } from "@/lib/token-products"

export type SubscriptionTier = "free" | "launch" | "momentum" | "command"

export interface TierLimits {
  monthlyTokens: number // Base tokens per month from subscription (0 = no access, -1 = unlimited)
  hasFollowUpWriter: boolean
  hasPitchGenerator: boolean
  hasChatAssistant: boolean
  hasProspectFinder: boolean
  hasVOCoach: boolean
  label: string
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    monthlyTokens: 0,
    hasFollowUpWriter: false,
    hasPitchGenerator: false,
    hasChatAssistant: false,
    hasProspectFinder: false,
    hasVOCoach: false,
    label: "Free",
  },
  launch: {
    monthlyTokens: 25, // ~5 emails
    hasFollowUpWriter: false,
    hasPitchGenerator: false,
    hasChatAssistant: false,
    hasProspectFinder: false,
    hasVOCoach: true, // Available at Launch+
    label: "Launch",
  },
  momentum: {
    monthlyTokens: 250, // ~50 emails or mix of features
    hasFollowUpWriter: true,
    hasPitchGenerator: true,
    hasChatAssistant: false,
    hasProspectFinder: true,
    hasVOCoach: true,
    label: "Momentum",
  },
  command: {
    monthlyTokens: -1, // unlimited
    hasFollowUpWriter: true,
    hasPitchGenerator: true,
    hasChatAssistant: true,
    hasProspectFinder: true,
    hasVOCoach: true,
    label: "Command",
  },
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

interface FeatureOverrides {
  hasFollowUpWriter?: boolean | null
  hasPitchGenerator?: boolean | null
  hasChatAssistant?: boolean | null
  hasProspectFinder?: boolean | null
  hasVOCoach?: boolean | null
  monthlyTokensOverride?: number | null
  disabled?: boolean
}

export async function getUserAIAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's subscription tier, purchased tokens, and feature overrides from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, purchased_tokens, feature_overrides")
    .eq("id", user.id)
    .single()

  // Check if account is disabled
  const overrides: FeatureOverrides = profile?.feature_overrides || {}
  if (overrides.disabled) {
    return null // Treat disabled accounts as not authenticated
  }

  const tier = (profile?.subscription_tier || "free") as SubscriptionTier
  const purchasedTokens = profile?.purchased_tokens || 0
  const baseLimits = TIER_LIMITS[tier]
  
  // Apply feature overrides
  const limits: TierLimits = {
    ...baseLimits,
    hasFollowUpWriter: overrides.hasFollowUpWriter ?? baseLimits.hasFollowUpWriter,
    hasPitchGenerator: overrides.hasPitchGenerator ?? baseLimits.hasPitchGenerator,
    hasChatAssistant: overrides.hasChatAssistant ?? baseLimits.hasChatAssistant,
    hasProspectFinder: overrides.hasProspectFinder ?? baseLimits.hasProspectFinder,
    hasVOCoach: overrides.hasVOCoach ?? baseLimits.hasVOCoach,
    monthlyTokens: overrides.monthlyTokensOverride ?? baseLimits.monthlyTokens,
  }
  
  const currentMonth = getCurrentMonth()

  // Get usage for this month
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("tokens_used")
    .eq("user_id", user.id)
    .eq("usage_month", currentMonth)
    .single()

  const tokensUsed = usage?.tokens_used || 0
  const isUnlimited = limits.monthlyTokens === -1
  
  // Total available = subscription tokens + purchased tokens
  const totalAvailable = isUnlimited ? Infinity : limits.monthlyTokens + purchasedTokens
  const remainingTokens = isUnlimited ? Infinity : Math.max(0, totalAvailable - tokensUsed)
  
  const canUseTokens = (cost: number) => 
    limits.monthlyTokens !== 0 && (isUnlimited || remainingTokens >= cost)

  return {
    userId: user.id,
    tier,
    limits,
    tokensUsed,
    purchasedTokens,
    monthlyTokens: limits.monthlyTokens,
    totalAvailable,
    remainingTokens,
    canGenerate: canUseTokens(TOKEN_COSTS.EMAIL_GENERATION),
    canResearch: canUseTokens(TOKEN_COSTS.WEB_RESEARCH),
    canChat: canUseTokens(TOKEN_COSTS.CHAT_MESSAGE),
    isUnlimited,
    currentMonth,
    tokenCosts: TOKEN_COSTS,
  }
}

export async function consumeTokens(userId: string, amount: number, operation: string) {
  const supabase = await createClient()
  const currentMonth = getCurrentMonth()

  // Get current usage
  const { data: existing } = await supabase
    .from("ai_usage")
    .select("id, tokens_used")
    .eq("user_id", userId)
    .eq("usage_month", currentMonth)
    .single()

  if (existing) {
    await supabase
      .from("ai_usage")
      .update({
        tokens_used: existing.tokens_used + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await supabase.from("ai_usage").insert({
      user_id: userId,
      usage_month: currentMonth,
      tokens_used: amount,
      generation_count: operation.includes('EMAIL') ? 1 : 0,
    })
  }

  // Log the token consumption
  await supabase.from("token_transactions").insert({
    user_id: userId,
    amount: -amount,
    operation,
    created_at: new Date().toISOString(),
  }).catch(() => {
    // Table may not exist yet, ignore
  })
}

export async function addPurchasedTokens(userId: string, tokens: number) {
  const supabase = await createClient()
  
  // Add tokens to user's purchased_tokens balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("purchased_tokens")
    .eq("id", userId)
    .single()

  const currentTokens = profile?.purchased_tokens || 0
  
  await supabase
    .from("profiles")
    .update({ 
      purchased_tokens: currentTokens + tokens,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  // Log the transaction
  await supabase.from("token_transactions").insert({
    user_id: userId,
    amount: tokens,
    operation: "PURCHASE",
    created_at: new Date().toISOString(),
  }).catch(() => {
    // Table may not exist yet, ignore
  })
}

// Legacy function for backward compatibility
export async function incrementUsage(userId: string) {
  await consumeTokens(userId, TOKEN_COSTS.EMAIL_GENERATION, "EMAIL_GENERATION")
}
