import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGmailThreadBody } from "@/lib/email-inbox-gmail"
import { getOutlookMessageBody } from "@/lib/email-inbox-graph"
import { getImapMessageBody } from "@/lib/email-inbox-imap"
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
  const accountId = url.searchParams.get("accountId")
  const gmailThreadId = url.searchParams.get("gmailThreadId")
  const outlookMessageId = url.searchParams.get("outlookMessageId")
  const imapUid = url.searchParams.get("imapUid")
  const folderParam = url.searchParams.get("folder") || "inbox"
  const folder = folderParam === "sent" ? "sent" : "inbox"

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", accountId)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const acc = row as EmailAccountRow

  try {
    if (acc.provider === "gmail" && gmailThreadId) {
      const body = await getGmailThreadBody(supabase, user.id, acc, gmailThreadId)
      return NextResponse.json(body)
    }
    if (acc.provider === "outlook" && outlookMessageId) {
      const body = await getOutlookMessageBody(
        supabase,
        user.id,
        acc,
        outlookMessageId
      )
      return NextResponse.json(body)
    }
    if (acc.provider === "smtp" && imapUid) {
      const uid = Number(imapUid)
      if (!Number.isFinite(uid)) {
        return NextResponse.json({ error: "invalid imapUid" }, { status: 400 })
      }
      const body = await getImapMessageBody(acc, uid, folder)
      return NextResponse.json(body)
    }
    return NextResponse.json(
      {
        error:
          "Provide gmailThreadId, outlookMessageId, or imapUid matching the account type",
      },
      { status: 400 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load message" },
      { status: 500 }
    )
  }
}
