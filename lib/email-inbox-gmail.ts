import type { EmailAccountRow } from "@/lib/email-account-types"
import { ensureGoogleAccessToken } from "@/lib/email-tokens"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NormalizedThread } from "@/lib/email-inbox-types"
import type { EmailMessageContent } from "@/lib/email-message-types"
import { sanitizeEmailHtml } from "@/lib/sanitize-email-html"

function headerMap(
  headers: { name?: string; value?: string }[] | undefined
): Record<string, string> {
  const m: Record<string, string> = {}
  for (const h of headers ?? []) {
    if (h.name && h.value) m[h.name.toLowerCase()] = h.value
  }
  return m
}

export async function listGmailThreads(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  options: { maxResults?: number; folder?: "inbox" | "sent" } = {}
): Promise<NormalizedThread[]> {
  const maxResults = options.maxResults ?? 20
  const folder = options.folder ?? "inbox"
  const query = folder === "sent" ? "in:sent" : "in:inbox"
  const accessToken = await ensureGoogleAccessToken(supabase, userId, row)
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}))
    throw new Error(err.error?.message || "Gmail thread list failed")
  }
  const listJson = (await listRes.json()) as {
    threads?: { id: string; snippet?: string }[]
  }
  const threads = listJson.threads ?? []
  const results: NormalizedThread[] = []
  for (const t of threads) {
    const tr = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!tr.ok) continue
    const threadJson = (await tr.json()) as {
      messages?: {
        id?: string
        internalDate?: string
        payload?: { headers?: { name: string; value: string }[] }
      }[]
    }
    const messages = threadJson.messages ?? []
    const msg =
      folder === "sent"
        ? messages[messages.length - 1] ?? messages[0]
        : messages[0]
    const headers = headerMap(msg?.payload?.headers)
    const internalDate = msg?.internalDate
      ? Number(msg.internalDate)
      : Date.now()
    results.push({
      id: `${row.id}:${t.id}`,
      threadKey: t.id,
      messageId: msg?.id,
      accountId: row.id,
      provider: "gmail",
      folder,
      subject: headers.subject || "(no subject)",
      from: headers.from || "",
      to: headers.to || "",
      snippet: t.snippet || "",
      internalDate,
    })
  }
  return results.sort((a, b) => b.internalDate - a.internalDate)
}

function extractGmailBodies(payload: unknown): { text: string; html: string } {
  let text = ""
  let html = ""

  function walk(part: unknown) {
    if (!part || typeof part !== "object") return
    const p = part as {
      mimeType?: string
      body?: { data?: string }
      parts?: unknown[]
    }
    if (p.mimeType === "text/plain" && p.body?.data && !text) {
      text = Buffer.from(p.body.data, "base64url").toString("utf8")
    }
    if (p.mimeType === "text/html" && p.body?.data && !html) {
      html = Buffer.from(p.body.data, "base64url").toString("utf8")
    }
    for (const sub of p.parts ?? []) walk(sub)
  }

  walk(payload)
  return { text, html }
}

export async function getGmailThreadBody(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  threadId: string
): Promise<EmailMessageContent> {
  const accessToken = await ensureGoogleAccessToken(supabase, userId, row)
  const tr = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!tr.ok) {
    const err = await tr.json().catch(() => ({}))
    throw new Error(err.error?.message || "Gmail thread fetch failed")
  }
  const threadJson = (await tr.json()) as {
    messages?: { id?: string; payload?: unknown }[]
  }
  const messages = threadJson.messages ?? []
  const last = messages[messages.length - 1]
  const { text, html } = extractGmailBodies(last?.payload)
  const headers = headerMap(
    (last?.payload as { headers?: { name: string; value: string }[] })?.headers
  )
  return {
    text: text || "(no plain text body)",
    html: sanitizeEmailHtml(html || text.replace(/\n/g, "<br>")),
    subject: headers.subject || "",
    from: headers.from || "",
    to: headers.to || "",
    cc: headers.cc || "",
    messageId: headers["message-id"] || undefined,
    gmailMessageId: last?.id,
    gmailThreadId: threadId,
  }
}

export async function deleteGmailThread(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  threadId: string
): Promise<void> {
  const accessToken = await ensureGoogleAccessToken(supabase, userId, row)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || "Gmail delete failed")
  }
}
