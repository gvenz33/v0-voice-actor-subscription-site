import type { EmailAccountRow } from "@/lib/email-account-types"
import { ensureMicrosoftAccessToken } from "@/lib/email-tokens"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NormalizedThread } from "@/lib/email-inbox-types"
import type { EmailMessageContent } from "@/lib/email-message-types"
import { prepareEmailHtmlForDisplay } from "@/lib/email-display-html"
import type { MailFolder } from "@/lib/email-folders"
import { OUTLOOK_FOLDER_SEGMENT } from "@/lib/email-folders"

function formatAddress(
  addr?: { emailAddress?: { name?: string; address?: string } }
): string {
  if (!addr?.emailAddress?.address) return ""
  const name = addr.emailAddress.name || ""
  return name
    ? `${name} <${addr.emailAddress.address}>`
    : addr.emailAddress.address
}

function formatRecipients(
  list?: Array<{ emailAddress?: { name?: string; address?: string } }>
): string {
  return (
    list
      ?.map((r) => formatAddress(r))
      .filter(Boolean)
      .join(", ") || ""
  )
}

export async function listOutlookMessages(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  options: { top?: number; folder?: MailFolder } = {}
): Promise<NormalizedThread[]> {
  const top = options.top ?? 25
  const folder = options.folder ?? "inbox"
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const folderSegment = OUTLOOK_FOLDER_SEGMENT[folder]
  const url = new URL(`https://graph.microsoft.com/v1.0/me/mailFolders/${folderSegment}/messages`)
  url.searchParams.set("$top", String(top))
  url.searchParams.set("$orderby", "receivedDateTime desc")
  url.searchParams.set(
    "$select",
    "id,subject,bodyPreview,receivedDateTime,conversationId,from,toRecipients"
  )

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || "Outlook inbox fetch failed")
  }
  const json = (await res.json()) as {
    value?: {
      id: string
      subject?: string
      bodyPreview?: string
      receivedDateTime?: string
      conversationId?: string
      from?: { emailAddress?: { name?: string; address?: string } }
      toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>
    }[]
  }
  const values = json.value ?? []
  return values.map((m) => ({
    id: `${row.id}:${m.id}`,
    threadKey: m.id,
    messageId: m.id,
    accountId: row.id,
    provider: "outlook" as const,
    folder,
    subject: m.subject || "(no subject)",
    from: formatAddress(m.from),
    to: formatRecipients(m.toRecipients),
    snippet: m.bodyPreview || "",
    internalDate: m.receivedDateTime
      ? new Date(m.receivedDateTime).getTime()
      : Date.now(),
  }))
}

export async function getOutlookMessageBody(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  messageId: string
): Promise<EmailMessageContent> {
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}?$select=subject,body,from,toRecipients,ccRecipients,internetMessageId`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || "Outlook message fetch failed")
  }
  const m = (await res.json()) as {
    subject?: string
    body?: { content?: string; contentType?: string }
    from?: { emailAddress?: { name?: string; address?: string } }
    toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>
    ccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>
    internetMessageId?: string
  }
  const ct = (m.body?.contentType || "").toLowerCase()
  const rawContent = m.body?.content || ""
  const isHtml = ct === "html" || ct === "text/html"
  const html = isHtml ? rawContent : ""
  const text =
    ct === "text" || ct === "text/plain"
      ? rawContent
      : stripHtml(rawContent)
  return {
    text: text || "(no body)",
    html: prepareEmailHtmlForDisplay(text, html || (isHtml ? rawContent : "")),
    subject: m.subject || "",
    from: formatAddress(m.from),
    to: formatRecipients(m.toRecipients),
    cc: formatRecipients(m.ccRecipients),
    messageId: m.internetMessageId,
  }
}

export async function deleteOutlookMessage(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  messageId: string
): Promise<void> {
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || "Outlook delete failed")
  }
}

export async function outlookReplyMessage(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  messageId: string,
  comment: string,
  mode: "reply" | "replyAll" | "forward"
): Promise<void> {
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const action =
    mode === "replyAll" ? "replyAll" : mode === "forward" ? "forward" : "reply"
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    }
  )
  if (!res.ok && res.status !== 202) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Outlook ${action} failed`)
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
