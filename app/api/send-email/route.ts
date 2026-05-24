import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { loadDemoReelAttachments } from "@/lib/demo-reels-server"
import { sendEmailMessage } from "@/lib/send-email-message"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await req.json()
  const {
    to,
    cc,
    subject,
    body: textBody,
    html,
    account_id: accountId,
    attachments: rawAttachments,
    in_reply_to: inReplyTo,
    references,
    gmail_thread_id: gmailThreadId,
    demo_reel_ids: demoReelIds,
  } = body

  if (!to || !subject || !textBody) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, body" },
      { status: 400 }
    )
  }

  type AttachmentPayload = {
    filename: string
    contentBase64: string
    contentType?: string
  }

  const attachments = Array.isArray(rawAttachments)
    ? (rawAttachments as AttachmentPayload[])
        .filter((a) => a?.filename && a?.contentBase64)
        .map((a) => ({
          filename: String(a.filename),
          content: Buffer.from(String(a.contentBase64), "base64"),
          contentType: a.contentType || "application/octet-stream",
        }))
    : []

  const demoAttachments = await loadDemoReelAttachments(
    supabase,
    user.id,
    Array.isArray(demoReelIds) ? demoReelIds.map(String) : []
  )

  const allAttachments = [...attachments, ...demoAttachments]

  const maxAttachmentBytes = 25 * 1024 * 1024
  const totalBytes = allAttachments.reduce((sum, a) => sum + a.content.length, 0)
  if (totalBytes > maxAttachmentBytes) {
    return NextResponse.json(
      { error: "Attachments exceed 25 MB total size limit" },
      { status: 400 }
    )
  }

  try {
    const result = await sendEmailMessage(supabase, {
      userId: user.id,
      to,
      cc,
      subject,
      text: textBody,
      html,
      accountId,
      attachments: allAttachments,
      inReplyTo,
      references,
      gmailThreadId,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("Send email error:", err)
    const raw = err instanceof Error ? err.message : String(err)
    let detail = raw
    if (/535|Invalid login|authentication failed|bad credentials/i.test(raw)) {
      detail = `${raw} For SMTP: use your full email as the username, an app-specific password (not your normal login) for Gmail/Yahoo/Microsoft when required, port 587 with TLS or 465 with SSL, and re-save SMTP in Settings if you edited the form without re-entering the password.`
    }
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
