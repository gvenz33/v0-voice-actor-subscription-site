import { createClient } from "@/lib/supabase/server"
import { getNotifyInboxEmail } from "@/lib/notify-inbox"
import { getSupportSystemPrompt } from "@/lib/support-system-prompt"
import { isSupportChatEnabled } from "@/lib/system-settings"

export const maxDuration = 30

function isOfflineConversationId(id: string | null | undefined): boolean {
  return !!id && id.startsWith("offline_")
}

export async function POST(req: Request) {
  try {
    const chatEnabled = await isSupportChatEnabled()
    if (!chatEnabled) {
      return Response.json(
        { error: "Support chat is currently unavailable." },
        { status: 503 }
      )
    }

    const { messages, conversationId, visitorId, visitorName, visitorEmail, requestEscalation } =
      await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (requestEscalation && conversationId) {
      if (!isOfflineConversationId(conversationId)) {
        try {
          await supabase
            .from("support_conversations")
            .update({
              status: "escalated",
              escalated_at: new Date().toISOString(),
              escalated_reason: "Customer requested human support",
            })
            .eq("id", conversationId)
        } catch (e) {
          console.warn("[support-chat] escalation update skipped:", e)
        }

        try {
          await supabase.from("support_notifications").insert({
            conversation_id: conversationId,
            admin_email: getNotifyInboxEmail(),
          })
        } catch (e) {
          console.warn("[support-chat] support_notifications insert skipped:", e)
        }
      }

      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/support/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            visitorName: visitorName || "Anonymous",
            visitorEmail: visitorEmail || "Not provided",
          }),
        })
      } catch (e) {
        console.error("Failed to send escalation notification:", e)
      }

      return Response.json({
        escalated: true,
        message:
          "I've notified our support team. Someone will follow up as soon as possible. In the meantime, is there anything else I can help clarify?",
      })
    }

    const groqKey = process.env.GROQ_API_KEY?.trim()
    if (!groqKey) {
      return Response.json(
        { error: "Chat is not configured (missing GROQ_API_KEY)." },
        { status: 503 }
      )
    }

    let convId: string | null = conversationId ?? null

    if (!convId) {
      try {
        const { data: conv, error: convError } = await supabase
          .from("support_conversations")
          .insert({
            visitor_id: visitorId,
            visitor_name: visitorName,
            visitor_email: visitorEmail,
            user_id: user?.id || null,
            status: "active",
          })
          .select("id")
          .single()

        if (convError || !conv?.id) {
          console.warn("[support-chat] conversation insert failed, using offline id:", convError)
          convId = `offline_${crypto.randomUUID()}`
        } else {
          convId = conv.id
        }
      } catch (e) {
        console.warn("[support-chat] conversation insert exception, using offline id:", e)
        convId = `offline_${crypto.randomUUID()}`
      }
    }

    const lastMessage = messages?.[messages.length - 1]
    if (
      lastMessage &&
      lastMessage.role === "user" &&
      convId &&
      !isOfflineConversationId(convId)
    ) {
      try {
        await supabase.from("support_messages").insert({
          conversation_id: convId,
          role: "user",
          content: lastMessage.content,
        })
      } catch (e) {
        console.warn("[support-chat] user message insert skipped:", e)
      }
    }

    const systemPrompt = getSupportSystemPrompt()

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 900,
        temperature: 0.6,
      }),
    })

    if (!res.ok) {
      let detail = "AI service error"
      try {
        const errJson = (await res.json()) as { error?: { message?: string } }
        detail = errJson.error?.message || JSON.stringify(errJson)
      } catch {
        detail = await res.text()
      }
      console.error("[support-chat] Groq error:", res.status, detail)
      return Response.json(
        { error: detail || "The assistant could not respond. Please try again." },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const assistantMessage =
      data.choices?.[0]?.message?.content ||
      "I'm having trouble forming a reply. Please email hello@vobizsuite.io or use Talk to a Human."

    if (convId && !isOfflineConversationId(convId)) {
      try {
        await supabase.from("support_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: assistantMessage,
        })
      } catch (e) {
        console.warn("[support-chat] assistant message insert skipped:", e)
      }
    }

    return Response.json({
      message: assistantMessage,
      conversationId: convId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[support-chat]", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
