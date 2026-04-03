import type { EmailAccountRow } from "@/lib/email-account-types"
import { ensureMicrosoftAccessToken } from "@/lib/email-tokens"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NormalizedThread } from "@/lib/email-inbox-types"

export async function listOutlookMessages(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  top = 25
): Promise<NormalizedThread[]> {
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const url = new URL("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages")
  url.searchParams.set("$top", String(top))
  url.searchParams.set("$orderby", "receivedDateTime desc")
  url.searchParams.set(
    "$select",
    "id,subject,bodyPreview,receivedDateTime,conversationId,from"
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
    }[]
  }
  const values = json.value ?? []
  return values.map((m) => ({
    id: `${row.id}:${m.id}`,
    threadKey: m.id,
    accountId: row.id,
    provider: "outlook" as const,
    subject: m.subject || "(no subject)",
    from: m.from?.emailAddress?.address
      ? `${m.from.emailAddress.name || ""} <${m.from.emailAddress.address}>`.trim()
      : "",
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
): Promise<{ text: string; subject: string; from: string }> {
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}?$select=subject,body,from`,
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
  }
  const from = m.from?.emailAddress?.address
    ? `${m.from.emailAddress.name || ""} <${m.from.emailAddress.address}>`.trim()
    : ""
  const ct = (m.body?.contentType || "").toLowerCase()
  const text =
    ct === "text" || ct === "text/plain"
      ? m.body?.content || ""
      : stripHtml(m.body?.content || "")
  return {
    text: text || "(no body)",
    subject: m.subject || "",
    from,
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
