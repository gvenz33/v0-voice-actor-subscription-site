import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"
import { getEmailAccountForSend } from "@/lib/email-accounts-server"
import { ensureGoogleAccessToken, ensureMicrosoftAccessToken } from "@/lib/email-tokens"
import type { EmailAccountRow } from "@/lib/email-account-types"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await req.json()
  const { to, subject, body: textBody, account_id: accountId } = body

  if (!to || !subject || !textBody) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, body" },
      { status: 400 }
    )
  }

  const { data: config, error: configError } = await getEmailAccountForSend(
    supabase,
    user.id,
    accountId
  )

  if (configError?.code === "PGRST205") {
    return NextResponse.json(
      {
        error:
          "Email accounts table not set up. Run scripts/email-accounts-and-calendar-sources.sql in Supabase.",
      },
      { status: 400 }
    )
  }

  if (configError || !config) {
    return NextResponse.json(
      {
        error:
          "No email account configured. Please connect Gmail, Outlook, or configure SMTP in Settings.",
      },
      { status: 400 }
    )
  }

  const row = config as EmailAccountRow

  try {
    if (row.provider === "gmail") {
      const accessToken = await ensureGoogleAccessToken(supabase, user.id, row)

      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        "",
        textBody,
      ].join("\n")

      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")

      const sendRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedMessage }),
        }
      )

      if (!sendRes.ok) {
        const err = await sendRes.json()
        throw new Error(err.error?.message || "Gmail send failed")
      }

      return NextResponse.json({
        success: true,
        provider: "gmail",
        from: row.oauth_email,
        account_id: row.id,
      })
    }

    if (row.provider === "outlook") {
      const accessToken = await ensureMicrosoftAccessToken(supabase, user.id, row)

      const sendRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: "Text", content: textBody },
            toRecipients: [{ emailAddress: { address: to } }],
          },
        }),
      })

      if (!sendRes.ok) {
        const err = await sendRes.json()
        throw new Error(err.error?.message || "Outlook send failed")
      }

      return NextResponse.json({
        success: true,
        provider: "outlook",
        from: row.oauth_email,
        account_id: row.id,
      })
    }

    if (row.provider === "smtp") {
      const transporter = nodemailer.createTransport({
        host: row.smtp_host ?? undefined,
        port: row.smtp_port || 587,
        secure: row.smtp_port === 465,
        auth: {
          user: row.smtp_username ?? undefined,
          pass: row.smtp_password ?? undefined,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })

      const mailOptions: nodemailer.SendMailOptions = {
        from: row.smtp_from_name
          ? `"${row.smtp_from_name}" <${row.smtp_from_email}>`
          : row.smtp_from_email ?? undefined,
        to,
        subject,
        text: textBody,
      }

      if (row.bcc_self && row.smtp_from_email) {
        mailOptions.bcc = row.smtp_from_email
      }

      const info = await transporter.sendMail(mailOptions)

      return NextResponse.json({
        success: true,
        provider: "smtp",
        from: row.smtp_from_email,
        messageId: info.messageId,
        account_id: row.id,
      })
    }

    return NextResponse.json({ error: "Unknown email provider" }, { status: 400 })
  } catch (err) {
    console.error("Send email error:", err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to send email",
      },
      { status: 500 }
    )
  }
}
