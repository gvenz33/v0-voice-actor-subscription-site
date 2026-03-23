import { streamText } from "ai"
import { gateway } from "@ai-sdk/gateway"
import { getUserAIAccess, consumeTokens } from '@/lib/ai-limits'
import { TOKEN_COSTS } from '@/lib/token-products'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are the VO Biz Suite AI Assistant — a knowledgeable, encouraging business coach for voice actors.

You help voice actors with:
- Cold outreach strategies to production companies, ad agencies, studios
- Crafting pitch emails and follow-ups
- Pricing and rate negotiation advice
- Marketing strategy for VO business
- Understanding industry terms (usage rights, buyouts, session fees)
- Time management and business workflow tips

Always be practical, actionable, and encouraging. Keep responses concise with bullet points when appropriate.`

export async function POST(req: Request) {
  try {
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

    const { messages } = await req.json()

    await consumeTokens(access.userId, TOKEN_COSTS.CHAT_MESSAGE, "CHAT_MESSAGE")

    const result = streamText({
      model: gateway("groq/llama-3.3-70b-versatile"),
      system: SYSTEM_PROMPT,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Chat error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
