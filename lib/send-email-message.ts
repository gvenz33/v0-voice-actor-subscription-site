import type { SupabaseClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { getEmailAccountForSend } from "@/lib/email-accounts-server"
import { ensureGoogleAccessToken, ensureMicrosoftAccessToken } from "@/lib/email-tokens"
import type { EmailAccountRow } from "@/lib/email-account-types"

export type EmailAttachment = {
  filename: string
  content: Buffer
  contentType: string
}

export type SendEmailMessageInput = {
  userId: string
  to: string
  subject: string
  text: string
  html?: string
  accountId?: string
  attachments?: EmailAttachment[]
}

function smtpPort(row: EmailAccountRow): number {
  const p = row.smtp_port
  if (typeof p === "number" && Number.isFinite(p)) return p
  const n = parseInt(String(p ?? ""), 10)
  return Number.isFinite(n) && n > 0 ? n : 587
}

function createSmtpTransporter(row: EmailAccountRow) {
  const port = smtpPort(row)
  const secure = port === 465
  const wantTls = row.smtp_use_tls !== false
  return nodemailer.createTransport({
    host: row.smtp_host ?? undefined,
    port,
    secure,
    requireTLS: wantTls && !secure,
    auth: {
      user: row.smtp_username?.trim() || undefined,
      pass: row.smtp_password || undefined,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

function buildMimeMultipartMixed(params: {
  to: string
  subject: string
  text: string
  html?: string
  fromEmail: string
  fromName?: string | null
  attachments: EmailAttachment[]
}) {
  const boundary = `mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const from = params.fromName
    ? `"${params.fromName.replace(/"/g, "")}" <${params.fromEmail}>`
    : params.fromEmail

  const parts: string[] = [
    `From: ${from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
  ]

  if (params.html) {
    const altBoundary = `alt_${Date.now()}`
    parts.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      params.text,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset=utf-8`,
      "",
      params.html,
      "",
      `--${altBoundary}--`,
      "",
      `--${boundary}`
    )
  } else {
    parts.push(`Content-Type: text/plain; charset=utf-8`, "", params.text, "", `--${boundary}`)
  }

  for (const attachment of params.attachments) {
    parts.push(
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      "",
      attachment.content.toString("base64"),
      "",
      `--${boundary}`
    )
  }

  parts.push("--")
  return parts.join("\r\n")
}

function encodeGmailRawMessage(message: string) {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function sendEmailMessage(
  supabase: SupabaseClient,
  input: SendEmailMessageInput
) {
  const { data: config, error: configError } = await getEmailAccountForSend(
    supabase,
    input.userId,
    input.accountId
  )

  if (configError?.code === "PGRST205") {
    throw new Error(
      "Email accounts table not set up. Run scripts/email-accounts-and-calendar-sources.sql in Supabase."
    )
  }

  if (configError || !config) {
    throw new Error(
      "No email account configured. Please connect Gmail, Outlook, or configure SMTP in Settings."
    )
  }

  const row = config as EmailAccountRow
  const attachments = input.attachments ?? []

  if (row.provider === "gmail") {
    const accessToken = await ensureGoogleAccessToken(supabase, input.userId, row)

    const message =
      attachments.length > 0
        ? buildMimeMultipartMixed({
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html,
            fromEmail: row.oauth_email ?? "",
            fromName: row.smtp_from_name,
            attachments,
          })
        : [
            `To: ${input.to}`,
            `Subject: ${input.subject}`,
            input.html
              ? `Content-Type: text/html; charset=utf-8`
              : `Content-Type: text/plain; charset=utf-8`,
            "",
            input.html ?? input.text,
          ].join("\n")

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodeGmailRawMessage(message) }),
    })

    if (!sendRes.ok) {
      const err = await sendRes.json()
      throw new Error(err.error?.message || "Gmail send failed")
    }

    return { provider: "gmail" as const, from: row.oauth_email, account_id: row.id }
  }

  if (row.provider === "outlook") {
    const accessToken = await ensureMicrosoftAccessToken(supabase, input.userId, row)

    const graphAttachments = attachments.map((file) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: file.filename,
      contentType: file.contentType,
      contentBytes: file.content.toString("base64"),
    }))

    const sendRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: {
            contentType: input.html ? "HTML" : "Text",
            content: input.html ?? input.text,
          },
          toRecipients: [{ emailAddress: { address: input.to } }],
          attachments: graphAttachments.length ? graphAttachments : undefined,
        },
      }),
    })

    if (!sendRes.ok) {
      const err = await sendRes.json()
      throw new Error(err.error?.message || "Outlook send failed")
    }

    return { provider: "outlook" as const, from: row.oauth_email, account_id: row.id }
  }

  if (row.provider === "smtp") {
    const smtpUser = row.smtp_username?.trim()
    const hasPassword = String(row.smtp_password ?? "").trim().length > 0
    if (!row.smtp_host?.trim()) {
      throw new Error("SMTP host is missing. Open Settings and save your SMTP settings again.")
    }
    if (!smtpUser || !hasPassword) {
      throw new Error(
        "SMTP username or password is missing. Re-enter your SMTP credentials in Settings."
      )
    }

    const transporter = createSmtpTransporter(row)
    const mailOptions: nodemailer.SendMailOptions = {
      from: row.smtp_from_name
        ? `"${row.smtp_from_name}" <${row.smtp_from_email}>`
        : row.smtp_from_email ?? undefined,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
      })),
    }

    if (row.bcc_self && row.smtp_from_email) {
      mailOptions.bcc = row.smtp_from_email
    }

    const info = await transporter.sendMail(mailOptions)
    return {
      provider: "smtp" as const,
      from: row.smtp_from_email,
      messageId: info.messageId,
      account_id: row.id,
    }
  }

  throw new Error("Unknown email provider")
}
