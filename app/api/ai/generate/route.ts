import { getUserAIAccess, consumeTokens } from '@/lib/ai-limits'
import { TOKEN_COSTS } from '@/lib/token-products'

export const maxDuration = 30

async function callGroq(prompt: string): Promise<string> {
  const apiKey = (process.env.GROQ_API_KEY || '').trim()
  
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set")
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 1.0,
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error("[v0] Groq API error response:", res.status, errorText)
    try {
      const error = JSON.parse(errorText)
      throw new Error(error.error?.message || `Groq API error: ${res.status}`)
    } catch {
      throw new Error(`Groq API error: ${res.status} - ${errorText.substring(0, 100)}`)
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

    // Determine token cost based on type
    const tokenCost = type === 'outreach_email' ? TOKEN_COSTS.EMAIL_GENERATION 
      : type === 'follow_up' ? TOKEN_COSTS.FOLLOWUP_GENERATION 
      : type === 'pitch_generator' ? TOKEN_COSTS.PITCH_GENERATION 
      : TOKEN_COSTS.EMAIL_GENERATION

    if (!access.canGenerate || (!access.isUnlimited && access.remainingTokens < tokenCost)) {
      return Response.json(
        {
          error: 'insufficient_tokens',
          tier: access.tier,
          remaining: access.remainingTokens,
          required: tokenCost,
          purchaseRequired: true,
        },
        { status: 429 }
      )
    }

    let prompt = ''

    if (type === 'outreach_email') {
      // Add variation elements for unique emails each time
      const openingStyles = ['question', 'compliment', 'observation', 'direct', 'story', 'statistic', 'bold_claim']
      const closingStyles = ['curious', 'helpful', 'confident', 'casual', 'enthusiastic']
      const toneModifiers = ['slightly humorous', 'warmly professional', 'confidently casual', 'genuinely curious', 'enthusiastically helpful']
      
      const randomOpening = openingStyles[Math.floor(Math.random() * openingStyles.length)]
      const randomClosing = closingStyles[Math.floor(Math.random() * closingStyles.length)]
      const randomTone = toneModifiers[Math.floor(Math.random() * toneModifiers.length)]
      const randomSeed = Math.floor(Math.random() * 10000)
      const wordCount = 100 + Math.floor(Math.random() * 80) // 100-180 words
      
      const openingInstructions: Record<string, string> = {
        question: 'an intriguing question about their recent project or industry trend',
        compliment: 'a specific, genuine compliment about their recent work (be creative)',
        observation: 'a fresh observation about their company or the industry',
        direct: 'a bold, direct statement about what you can offer them',
        story: 'a brief 1-sentence personal anecdote that connects to their work',
        statistic: 'a surprising industry fact or statistic relevant to their work',
        bold_claim: 'a confident claim about your unique value as a voice actor'
      }
      
      prompt = `Write a unique cold outreach email from a voice actor to a production company. Make this email COMPLETELY DIFFERENT from any template.

Context:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact: ${context.contactName}` : ''}
${context.genre ? `Genre/Specialty: ${context.genre}` : ''}
${context.tone ? `Requested tone: ${context.tone}` : ''}
${context.customNotes ? `Additional context: ${context.customNotes}` : ''}

CREATIVE DIRECTION (seed ${randomSeed}):
1. OPENING: Start with ${openingInstructions[randomOpening]}
2. TONE: Write in a ${randomTone} voice throughout
3. CLOSING: End with a ${randomClosing} call-to-action
4. LENGTH: Approximately ${wordCount} words

STRICT RULES:
- NO generic phrases like "I hope this email finds you well", "I came across", "I wanted to reach out"
- Each sentence should feel fresh and specific
- Include ONE memorable detail or hook
- Sign off with [Your Name] only (no signature block)

OUTPUT FORMAT (follow exactly):
SUBJECT: [Write a compelling, specific subject line - 5-10 words]
---
[Email body here]`
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

    const rawText = await callGroq(prompt)

    await consumeTokens(access.userId, tokenCost, type.toUpperCase())

    // Parse subject line from outreach emails
    let text = rawText
    let subject = ''
    
    if (type === 'outreach_email' && rawText.includes('SUBJECT:')) {
      const lines = rawText.split('\n')
      const subjectLine = lines.find(l => l.startsWith('SUBJECT:'))
      if (subjectLine) {
        subject = subjectLine.replace('SUBJECT:', '').trim()
        // Remove subject line and separator from body
        const separatorIndex = rawText.indexOf('---')
        if (separatorIndex !== -1) {
          text = rawText.substring(separatorIndex + 3).trim()
        } else {
          // Fallback: remove just the subject line
          text = lines.filter(l => !l.startsWith('SUBJECT:')).join('\n').trim()
        }
      }
    }

    return Response.json({
      text,
      subject,
      usage: {
        tokensUsed: tokenCost,
        remaining: access.isUnlimited ? -1 : access.remainingTokens - tokenCost,
        isUnlimited: access.isUnlimited,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Generate error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
