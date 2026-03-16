import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { getUserAIAccess, incrementUsage } from '@/lib/ai-limits'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
  // Check user's tier and usage
  console.log("[v0] Generate route called")
  const access = await getUserAIAccess()
  console.log("[v0] Access result:", access ? { tier: access.tier, canGenerate: access.canGenerate, count: access.generationCount } : "null")

  if (!access) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { type, context } = await req.json()
  console.log("[v0] Generate type:", type, "| Company:", context?.companyName)

  // Check feature access based on tier
  if (type === 'follow_up' && !access.limits.hasFollowUpWriter) {
    return Response.json(
      { error: 'upgrade_required', feature: 'Follow-Up Writer', requiredTier: 'Momentum' },
      { status: 403 }
    )
  }

  if (type === 'pitch_generator' && !access.limits.hasPitchGenerator) {
    return Response.json(
      { error: 'upgrade_required', feature: 'Pitch Generator', requiredTier: 'Momentum' },
      { status: 403 }
    )
  }

  // Check generation limit
  if (!access.canGenerate) {
    return Response.json(
      {
        error: 'limit_reached',
        tier: access.tier,
        used: access.generationCount,
        limit: access.limits.monthlyGenerations,
      },
      { status: 429 }
    )
  }

  let prompt = ''

  if (type === 'outreach_email') {
    prompt = `Write a professional cold outreach email from an independent voice actor to a production company or client.

Context provided by the voice actor:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact Person: ${context.contactName}` : ''}
${context.genre ? `Genre/Niche: ${context.genre}` : ''}
${context.tone ? `Desired Tone: ${context.tone}` : ''}
${context.customNotes ? `Additional Notes: ${context.customNotes}` : ''}

Guidelines:
- Keep it under 150 words
- Be professional but personable
- Mention a specific reason for reaching out (reference their work if company name given)
- Include a clear call to action (listen to demo, schedule a quick call)
- Do NOT be salesy or desperate
- Sign off with [Your Name] as placeholder
- Output ONLY the email text, no extra commentary`
  } else if (type === 'pitch_generator') {
    prompt = `Write a compelling elevator pitch for an independent voice actor.

Context:
${context.genre ? `Specialization: ${context.genre}` : ''}
${context.experience ? `Experience Level: ${context.experience}` : ''}
${context.strengths ? `Key Strengths: ${context.strengths}` : ''}
${context.targetAudience ? `Target Clients: ${context.targetAudience}` : ''}

Guidelines:
- Keep it to 2-3 sentences (under 60 words)
- Make it memorable and specific
- Highlight what makes this voice actor unique
- Output ONLY the pitch text, no extra commentary`
  } else if (type === 'follow_up') {
    prompt = `Write a follow-up email for a voice actor who previously reached out to a client.

Context:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact: ${context.contactName}` : ''}
${context.daysSince ? `Days since last contact: ${context.daysSince}` : ''}
${context.previousContext ? `Previous interaction: ${context.previousContext}` : ''}
${context.customNotes ? `Notes: ${context.customNotes}` : ''}

Guidelines:
- Keep it under 100 words
- Reference the previous outreach naturally
- Provide a new reason to connect (new demo, seasonal availability, industry news)
- Be warm but professional, not pushy
- Include a soft call to action
- Sign off with [Your Name]
- Output ONLY the email text, no extra commentary`
  }

  console.log("[v0] Calling Groq with model llama-3.3-70b-versatile, prompt length:", prompt.length)

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    prompt,
    maxTokens: 500,
  })

  console.log("[v0] Groq response received, length:", text?.length)

  // Track usage after successful generation
  await incrementUsage(access.userId)

  return Response.json({
    text,
    usage: {
      used: access.generationCount + 1,
      limit: access.limits.monthlyGenerations,
      isUnlimited: access.isUnlimited,
    },
  })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Generate route error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
