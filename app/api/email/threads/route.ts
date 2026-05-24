import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listEmailAccounts } from "@/lib/email-accounts-server"
import { listGmailThreads } from "@/lib/email-inbox-gmail"
import { listOutlookMessages } from "@/lib/email-inbox-graph"
import { listImapMessages } from "@/lib/email-inbox-imap"
import type { NormalizedThread } from "@/lib/email-inbox-types"
import { parseMailFolder } from "@/lib/email-folders"
import type { EmailAccountRow } from "@/lib/email-account-types"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const url = new URL(req.url)
  const accountId = url.searchParams.get("accountId") || "all"
  const folder = parseMailFolder(url.searchParams.get("folder"))

  const { data: accounts, error: listErr } = await listEmailAccounts(supabase, user.id)
  if (listErr?.message.includes("does not exist") || listErr?.message.includes("schema cache")) {
    return NextResponse.json(
      { error: "email_accounts table missing", threads: [] },
      { status: 503 }
    )
  }

  const selected: EmailAccountRow[] =
    accountId === "all"
      ? accounts
      : accounts.filter((a) => a.id === accountId)

  if (accountId !== "all" && selected.length === 0) {
    return NextResponse.json({ error: "Account not found", threads: [] }, { status: 404 })
  }

  const merged: NormalizedThread[] = []
  const errors: string[] = []

  for (const acc of selected) {
    try {
      if (acc.provider === "gmail") {
        merged.push(...(await listGmailThreads(supabase, user.id, acc, { folder })))
      } else if (acc.provider === "outlook") {
        merged.push(...(await listOutlookMessages(supabase, user.id, acc, { folder })))
      } else if (acc.provider === "smtp" && acc.imap_host) {
        merged.push(...(await listImapMessages(acc, { folder })))
      }
    } catch (e) {
      errors.push(
        `${acc.oauth_email || acc.smtp_from_email || acc.id}: ${
          e instanceof Error ? e.message : "fetch failed"
        }`
      )
    }
  }

  merged.sort((a, b) => b.internalDate - a.internalDate)

  return NextResponse.json({ threads: merged, errors })
}
