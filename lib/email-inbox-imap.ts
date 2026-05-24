import type { EmailAccountRow } from "@/lib/email-account-types"
import type { NormalizedThread } from "@/lib/email-inbox-types"
import type { EmailMessageContent } from "@/lib/email-message-types"
import { prepareEmailHtmlForDisplay } from "@/lib/email-display-html"
import type { MailFolder } from "@/lib/email-folders"
import { IMAP_FOLDER_CANDIDATES } from "@/lib/email-folders"
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"

function imapClient(row: EmailAccountRow) {
  const user =
    row.imap_username?.trim() || row.smtp_username?.trim() || ""
  const pass =
    row.imap_password?.trim() || row.smtp_password?.trim() || ""
  if (!row.imap_host || !user || !pass) {
    throw new Error("IMAP host, username, and password required")
  }
  return new ImapFlow({
    host: row.imap_host,
    port: row.imap_port || 993,
    secure: row.imap_use_tls !== false,
    auth: { user, pass },
    logger: false,
  })
}

async function openImapMailbox(client: ImapFlow, folder: MailFolder): Promise<string> {
  const candidates = IMAP_FOLDER_CANDIDATES[folder]
  for (const name of candidates) {
    try {
      await client.mailboxOpen(name)
      return name
    } catch {
      continue
    }
  }
  throw new Error(`Could not open ${folder} folder for this IMAP account`)
}

function formatImapAddress(
  list?: Array<{ name?: string; address?: string } | string>
): string {
  if (!list?.length) return ""
  return list
    .map((addr) => {
      if (typeof addr === "string") return addr
      if (addr.address) {
        return addr.name ? `${addr.name} <${addr.address}>` : addr.address
      }
      return addr.name || ""
    })
    .filter(Boolean)
    .join(", ")
}

export async function listImapMessages(
  row: EmailAccountRow,
  options: { maxResults?: number; folder?: MailFolder } = {}
): Promise<NormalizedThread[]> {
  const maxResults = options.maxResults ?? 25
  const folder = options.folder ?? "inbox"
  if (!row.imap_host) {
    throw new Error("IMAP host not configured for this account")
  }

  const client = imapClient(row)

  await client.connect()
  try {
    await openImapMailbox(client, folder)
    const uids = await client.search({ all: true }, { uid: true })
    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return []
    }
    const nums = uids.map((u) => Number(u)).filter((n) => Number.isFinite(n))
    const slice = nums.slice(-maxResults).reverse()
    const out: NormalizedThread[] = []

    for await (const msg of client.fetch(
      slice,
      {
        envelope: true,
        uid: true,
        internalDate: true,
      },
      { uid: true }
    )) {
      const env = msg.envelope
      const fromAddr = env?.from?.[0]
      const toAddr = env?.to?.[0]
      const from =
        (fromAddr && "address" in fromAddr && fromAddr.address) ||
        (fromAddr && "name" in fromAddr && fromAddr.name) ||
        ""
      const to =
        env?.to
          ?.map((addr) =>
            ("address" in addr && addr.address) || ("name" in addr && addr.name) || ""
          )
          .filter(Boolean)
          .join(", ") ||
        (toAddr && "address" in toAddr && toAddr.address) ||
        (toAddr && "name" in toAddr && toAddr.name) ||
        ""
      const subject = env?.subject || "(no subject)"
      const internalDate = msg.internalDate
        ? new Date(msg.internalDate).getTime()
        : Date.now()
      out.push({
        id: `${row.id}:${msg.uid}`,
        threadKey: String(msg.uid),
        messageId: String(msg.uid),
        accountId: row.id,
        provider: "smtp",
        folder,
        subject,
        from: String(from),
        to: String(to),
        snippet: "",
        internalDate,
      })
    }
    return out.sort((a, b) => b.internalDate - a.internalDate)
  } finally {
    await client.logout()
  }
}

export async function getImapMessageBody(
  row: EmailAccountRow,
  uid: number,
  folder: MailFolder = "inbox"
): Promise<EmailMessageContent> {
  const client = imapClient(row)

  await client.connect()
  try {
    await openImapMailbox(client, folder)
    const msg = await client.fetchOne(
      uid,
      { envelope: true, source: true, uid: true },
      { uid: true }
    )
    if (!msg) {
      return {
        text: "(not found)",
        html: "",
        subject: "",
        from: "",
        to: "",
        cc: "",
      }
    }
    const subject = msg.envelope?.subject || ""
    const from = formatImapAddress(msg.envelope?.from as never)
    const to = formatImapAddress(msg.envelope?.to as never)
    const cc = formatImapAddress(msg.envelope?.cc as never)

    if (msg.source) {
      const parsed = await simpleParser(msg.source)
      const text = parsed.text || ""
      const htmlRaw = parsed.html ? String(parsed.html) : ""
      return {
        text: text || "(no body)",
        html: prepareEmailHtmlForDisplay(text, htmlRaw),
        subject,
        from,
        to,
        cc,
        messageId: parsed.messageId || undefined,
      }
    }

    return {
      text: "(no body)",
      html: "",
      subject,
      from,
      to,
      cc,
    }
  } finally {
    await client.logout()
  }
}

export async function deleteImapMessage(
  row: EmailAccountRow,
  uid: number,
  folder: MailFolder = "inbox"
): Promise<void> {
  const client = imapClient(row)
  await client.connect()
  try {
    await openImapMailbox(client, folder)
    await client.messageDelete(uid, { uid: true })
  } finally {
    await client.logout()
  }
}
