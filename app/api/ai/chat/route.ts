import { getUserAIAccess, incrementUsage } from '@/lib/ai-limits'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are the VO Biz Suite AI Assistant — a knowledgeable, encouraging business coach for independent voice actors.

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

    await incrementUsage(access.userId)

    // Call xAI Grok with streaming
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || 'xAI API error')
    }

    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const json = JSON.parse(data)
                const content = json.choices[0]?.delta?.content
                if (content) {
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`))
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        controller.enqueue(encoder.encode('e:{"finishReason":"stop"}\n'))
        controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Chat error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
