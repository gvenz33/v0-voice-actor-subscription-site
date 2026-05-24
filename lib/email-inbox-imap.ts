import type { EmailAccountRow } from "@/lib/email-account-types"
import type { NormalizedThread } from "@/lib/email-inbox-types"
import { ImapFlow } from "imapflow"

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

export async function listImapMessages(
  row: EmailAccountRow,
  options: { maxResults?: number; folder?: "inbox" | "sent" } = {}
): Promise<NormalizedThread[]> {
  const maxResults = options.maxResults ?? 25
  const folder = options.folder ?? "inbox"
  if (!row.imap_host) {
    throw new Error("IMAP host not configured for this account")
  }

  const client = imapClient(row)

  await client.connect()
  try {
    const mailboxName =
      folder === "sent"
        ? await openSentMailbox(client)
        : "INBOX"
    await client.mailboxOpen(mailboxName)
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

async function openSentMailbox(client: ImapFlow): Promise<string> {
  const candidates = ["Sent", "Sent Items", "Sent Mail", "[Gmail]/Sent Mail", "INBOX.Sent"]
  for (const name of candidates) {
    try {
      await client.mailboxOpen(name)
      return name
    } catch {
      continue
    }
  }
  throw new Error("Could not open Sent folder for this IMAP account")
}

export async function getImapMessageBody(
  row: EmailAccountRow,
  uid: number,
  folder: "inbox" | "sent" = "inbox"
): Promise<{ text: string; subject: string; from: string }> {
  const client = imapClient(row)

  await client.connect()
  try {
    const mailboxName =
      folder === "sent" ? await openSentMailbox(client) : "INBOX"
    await client.mailboxOpen(mailboxName)
    const msg = await client.fetchOne(
      uid,
      { envelope: true, source: true, uid: true },
      { uid: true }
    )
    if (!msg) {
      return { text: "(not found)", subject: "", from: "" }
    }
    const subject = msg.envelope?.subject || ""
    const fromAddr = msg.envelope?.from?.[0]
    const from =
      (fromAddr && "address" in fromAddr && fromAddr.address) ||
      (fromAddr && "name" in fromAddr && fromAddr.name) ||
      ""
    let text = ""
    if (msg.source) {
      const raw = msg.source.toString()
      const parts = raw.split(/\r?\n\r?\n/)
      if (parts.length > 1) {
        text = parts.slice(1).join("\n\n")
      } else {
        text = raw
      }
    }
    return { text: text.trim() || "(no body)", subject, from: String(from) }
  } finally {
    await client.logout()
  }
}
