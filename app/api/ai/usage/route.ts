import { getUserAIAccess } from '@/lib/ai-limits'

export async function GET() {
  const access = await getUserAIAccess()

  if (!access) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return Response.json({
    tier: access.tier,
    tierLabel: access.limits.label,
    generationCount: access.generationCount,
    monthlyLimit: access.limits.monthlyGenerations,
    remainingGenerations: access.isUnlimited ? -1 : access.remainingGenerations,
    isUnlimited: access.isUnlimited,
    canGenerate: access.canGenerate,
    hasFollowUpWriter: access.limits.hasFollowUpWriter,
    hasPitchGenerator: access.limits.hasPitchGenerator,
    hasChatAssistant: access.limits.hasChatAssistant,
  })
}
