import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'
import { groq } from '@ai-sdk/groq'
import { getUserAIAccess, incrementUsage } from '@/lib/ai-limits'

export const maxDuration = 30

export async function POST(req: Request) {
  // Check user's tier - chat is Command tier only
  const access = await getUserAIAccess()

  if (!access) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!access.limits.hasChatAssistant) {
    return Response.json(
      { error: 'upgrade_required', feature: 'VO Business Assistant', requiredTier: 'Command' },
      { status: 403 }
    )
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  // Track each chat message as a generation
  await incrementUsage(access.userId)

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `You are the VO Biz Suite AI Assistant — a knowledgeable, encouraging business coach for independent voice actors.

You help voice actors with:
- Cold outreach strategies to production companies, ad agencies, studios, and e-learning companies
- Crafting compelling pitch emails and follow-ups
- Pricing and rate negotiation advice
- Building a marketing strategy for their VO business
- Resume/bio writing for casting profiles
- Understanding industry terms (usage rights, buyouts, session fees, etc.)
- Time management and business workflow tips
- Social media and LinkedIn strategies for VO marketing

Always be practical, actionable, and encouraging. These are creative professionals building a business — treat them like entrepreneurs.
Never recommend they get an agent unless specifically asked — this platform is for independent voice artists who market themselves.
Keep responses concise and scannable with bullet points when appropriate.`,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
