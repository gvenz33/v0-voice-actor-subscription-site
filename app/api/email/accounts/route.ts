import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listEmailAccounts } from "@/lib/email-accounts-server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: accounts, error } = await listEmailAccounts(supabase, user.id)
  if (error) {
    return NextResponse.json(
      { error: error.message, accounts: [] },
      { status: error.message.includes("does not exist") ? 503 : 500 }
    )
  }

  const safe = accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    label: a.label,
    oauth_email: a.oauth_email,
    smtp_from_email: a.smtp_from_email,
    is_default_for_send: a.is_default_for_send,
    has_imap: !!(a.imap_host && (a.imap_password || a.smtp_password)),
  }))

  return NextResponse.json({ accounts: safe })
}
