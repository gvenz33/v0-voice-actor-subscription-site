import { convertToModelMessages, type UIMessage } from "ai"
import { generateChatReply } from "@/lib/chat-ai"
import { getUserAIAccess, consumeTokens } from "@/lib/ai-limits"
import { TOKEN_COSTS } from "@/lib/token-products"

export const maxDuration = 30

const SYSTEM_PROMPT = `You are the VO Biz Suite AI Assistant — a knowledgeable, encouraging business coach for voice actors.

You help voice actors with:
- Cold outreach strategies to production companies, ad agencies, studios
- Crafting pitch emails and follow-ups
- Pricing and rate negotiation advice
- Marketing strategy for VO business
- Understanding industry terms (usage rights, buyouts, session fees)
- Time management and business workflow tips
- Career decisions for union and non-union voice actors
- Business strategy for both agent-represented voice actors and independent (self-represented) voice actors

Always be practical, actionable, and encouraging. Keep responses concise with bullet points when appropriate.`

export async function POST(req: Request) {
  try {
    const access = await getUserAIAccess()

    if (!access) {
      return Response.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!access.limits.hasChatAssistant) {
      return Response.json(
        {
          error: "upgrade_required",
          feature: "VO Business Assistant",
          requiredTier: "Command",
        },
        { status: 403 }
      )
    }

    const { messages } = (await req.json()) as { messages: UIMessage[] }
    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "messages array required" }, { status: 400 })
    }

    await consumeTokens(access.userId, TOKEN_COSTS.CHAT_MESSAGE, "CHAT_MESSAGE")

    // Cap history to reduce token usage and avoid burning quota.
    const recentMessages = messages.slice(-8)

    const modelMessages = await convertToModelMessages(recentMessages)
    const text = await generateChatReply(SYSTEM_PROMPT, modelMessages)

    // Plain text response so the dashboard hook can display it reliably.
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Chat error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
