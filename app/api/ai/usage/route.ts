import { getUserAIAccess } from '@/lib/ai-limits'

export async function GET() {
  const access = await getUserAIAccess()

  if (!access) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return Response.json({
    tier: access.tier,
    tierLabel: access.limits.label,
    // Legacy fields for backward compatibility
    generationCount: access.tokensUsed,
    monthlyLimit: access.monthlyTokens,
    remainingGenerations: access.isUnlimited ? -1 : access.remainingTokens,
    // New token fields
    tokensUsed: access.tokensUsed,
    purchasedTokens: access.purchasedTokens,
    monthlyTokens: access.monthlyTokens,
    totalAvailable: access.totalAvailable,
    remainingTokens: access.isUnlimited ? -1 : access.remainingTokens,
    isUnlimited: access.isUnlimited,
    canGenerate: access.canGenerate,
    canResearch: access.canResearch,
    canChat: access.canChat,
    hasFollowUpWriter: access.limits.hasFollowUpWriter,
    hasPitchGenerator: access.limits.hasPitchGenerator,
    hasChatAssistant: access.limits.hasChatAssistant,
    hasProspectFinder: access.limits.hasProspectFinder,
    tokenCosts: access.tokenCosts,
  })
}
