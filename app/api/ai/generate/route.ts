import { getUserAIAccess, incrementUsage } from '@/lib/ai-limits'

export const maxDuration = 30

async function callGrok(prompt: string): Promise<string> {
  const apiKey = (process.env.XAI_API_KEY || '').trim()
  
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set")
  }

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error("[v0] xAI API error response:", res.status, errorText)
    try {
      const error = JSON.parse(errorText)
      throw new Error(error.error?.message || `xAI API error: ${res.status}`)
    } catch {
      throw new Error(`xAI API error: ${res.status} - ${errorText.substring(0, 100)}`)
    }
  }

  const data = await res.json()
  return data.choices[0]?.message?.content || ''
}

export async function POST(req: Request) {
  try {
    const access = await getUserAIAccess()

    if (!access) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { type, context } = await req.json()

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
      prompt = `Write a professional cold outreach email from an independent voice actor to a production company.

Context:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact: ${context.contactName}` : ''}
${context.genre ? `Genre: ${context.genre}` : ''}
${context.tone ? `Tone: ${context.tone}` : ''}
${context.customNotes ? `Notes: ${context.customNotes}` : ''}

Rules:
- Under 150 words
- Professional but personable
- Clear call to action
- Sign off with [Your Name]
- Output ONLY the email, no commentary`
    } else if (type === 'pitch_generator') {
      prompt = `Write a 2-3 sentence elevator pitch for a voice actor.

Context:
${context.genre ? `Specialization: ${context.genre}` : ''}
${context.experience ? `Experience: ${context.experience}` : ''}
${context.strengths ? `Strengths: ${context.strengths}` : ''}

Rules:
- Under 60 words
- Memorable and specific
- Output ONLY the pitch, no commentary`
    } else if (type === 'follow_up') {
      prompt = `Write a follow-up email for a voice actor.

Context:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact: ${context.contactName}` : ''}
${context.daysSince ? `Days since last contact: ${context.daysSince}` : ''}
${context.previousContext ? `Previous interaction: ${context.previousContext}` : ''}

Rules:
- Under 100 words
- Reference previous outreach
- Soft call to action
- Sign off with [Your Name]
- Output ONLY the email, no commentary`
    }

    const text = await callGrok(prompt)

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
    console.error("[v0] Generate error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
