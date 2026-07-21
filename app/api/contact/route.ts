import { NextResponse } from "next/server"
import { getNotifyInboxEmail } from "@/lib/notify-inbox"
import { getTransactionalFromAddress } from "@/lib/resend-from"

/** Lazy-load Resend so builds succeed without RESEND_API_KEY (same pattern as support/notify). */
export const dynamic = "force-dynamic"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const toEmail = getNotifyInboxEmail()
    const subject = `Contact Form: ${name}`
    const textBody = `
Name: ${name}
Email: ${email}

Message:
${message}

---
Sent from VOBizSuite Contact Form
`.trim()

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 503 }
      )
    }

    const { Resend } = await import("resend")
    const resend = new Resend(resendApiKey)

    await resend.emails.send({
      from: getTransactionalFromAddress("VOBizSuite Contact"),
      to: toEmail,
      replyTo: email,
      subject,
      text: textBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Contact form message</h2>
          <p><strong>Name:</strong> ${escapeHtml(String(name))}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(String(email))}">${escapeHtml(String(email))}</a></p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(String(message))}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Sent from VOBizSuite Contact Form</p>
        </div>
      `,
    })

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    try {
      await supabase.from("contact_submissions").insert({
        name,
        email,
        message,
        created_at: new Date().toISOString(),
      })
    } catch {
      console.log("Contact submissions table not available, skipping database storage")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    const msg = error instanceof Error ? error.message : "Failed to send message"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
