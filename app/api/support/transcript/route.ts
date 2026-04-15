import "server-only"
import { getNotifyInboxEmail } from "@/lib/notify-inbox"

export const dynamic = "force-dynamic"

type Msg = { role: string; content: string }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const visitorEmail = String(body.visitorEmail ?? "").trim()
    const visitorName = String(body.visitorName ?? "").trim()
    const messages = (body.messages ?? []) as Msg[]

    if (!visitorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
      return Response.json({ error: "Valid email required for transcript" }, { status: 400 })
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "No messages to send" }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    if (!resendApiKey) {
      return Response.json({ error: "Email not configured" }, { status: 503 })
    }

    const { Resend } = await import("resend")
    const resend = new Resend(resendApiKey)

    const lines = messages.map((m) => {
      const label =
        m.role === "user" ? "You" : m.role === "assistant" ? "Support" : m.role
      return `${label}: ${m.content}`
    })
    const textBody = lines.join("\n\n---\n\n")

    const htmlBody = `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #333;">Your VOBizSuite support chat transcript</h2>
        <p style="color: #666;">Hi${visitorName ? ` ${escapeHtml(visitorName)}` : ""}, here is a copy of your conversation.</p>
        <div style="margin-top: 16px;">
          ${messages
            .map((m) => {
              const label =
                m.role === "user"
                  ? "You"
                  : m.role === "assistant"
                    ? "Support"
                    : escapeHtml(m.role)
              const cls =
                m.role === "user"
                  ? "background: #e0f2fe; border-left: 4px solid #0284c7;"
                  : "background: #f4f4f5; border-left: 4px solid #71717a;"
              return `<div style="margin-bottom: 12px; padding: 12px; ${cls}">
                <strong>${label}</strong>
                <div style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(m.content)}</div>
              </div>`
            })
            .join("")}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          Sent from VOBizSuite · Questions? ${escapeHtml(getNotifyInboxEmail())}
        </p>
      </div>
    `

    const inbox = getNotifyInboxEmail()
    await resend.emails.send({
      from: "VOBizSuite Support <noreply@vobizsuite.io>",
      to: visitorEmail,
      bcc: inbox,
      subject: "Your VOBizSuite support chat transcript",
      text: `Support chat transcript\n\n${textBody}\n\n—\nVOBizSuite · ${inbox}`,
      html: htmlBody,
    })

    return Response.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[support/transcript]", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
