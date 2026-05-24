import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteGmailThread } from "@/lib/email-inbox-gmail"
import { deleteOutlookMessage } from "@/lib/email-inbox-graph"
import { deleteImapMessage } from "@/lib/email-inbox-imap"
import type { EmailAccountRow } from "@/lib/email-account-types"

export const runtime = "nodejs"

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
    accountId,
    provider,
    gmailThreadId,
    outlookMessageId,
    imapUid,
    folder: folderParam,
  } = body

  if (!accountId || !provider) {
    return NextResponse.json(
      { error: "accountId and provider required" },
      { status: 400 }
    )
  }

  const folder = folderParam === "sent" ? "sent" : "inbox"

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
    if (provider === "gmail" && gmailThreadId) {
      await deleteGmailThread(supabase, user.id, acc, gmailThreadId)
      return NextResponse.json({ success: true })
    }
    if (provider === "outlook" && outlookMessageId) {
      await deleteOutlookMessage(supabase, user.id, acc, outlookMessageId)
      return NextResponse.json({ success: true })
    }
    if (provider === "smtp" && imapUid) {
      const uid = Number(imapUid)
      if (!Number.isFinite(uid)) {
        return NextResponse.json({ error: "invalid imapUid" }, { status: 400 })
      }
      await deleteImapMessage(acc, uid, folder)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json(
      { error: "Provide gmailThreadId, outlookMessageId, or imapUid" },
      { status: 400 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    )
  }
}
