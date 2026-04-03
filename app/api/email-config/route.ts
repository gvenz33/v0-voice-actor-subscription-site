import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function tableExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string
) {
  const { error } = await supabase.from(name).select("id").limit(1)
  if (error?.code === "PGRST205" || error?.message?.includes("does not exist")) {
    return false
  }
  return true
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const accountsOk = await tableExists(supabase, "email_accounts")
  if (!accountsOk) {
    return NextResponse.json({
      accounts: [],
      calendarSources: [],
      config: null,
      hasConfig: false,
      tableNotCreated: true,
    })
  }

  const { data: accounts, error: accErr } = await supabase
    .from("email_accounts")
    .select(
      "id, provider, label, oauth_email, smtp_host, smtp_from_email, smtp_from_name, bcc_self, is_default_for_send, imap_host, imap_port, imap_username"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (accErr) {
    console.error("Error fetching email accounts:", accErr)
  }

  const list = accounts ?? []
  const defaultAcc = list.find((a) => a.is_default_for_send) ?? list[0]

  let calendarSources: Array<{
    id: string
    display_name: string | null
    caldav_url: string
    caldav_username: string
  }> = []

  const calOk = await tableExists(supabase, "calendar_sources")
  if (calOk) {
    const { data: cals } = await supabase
      .from("calendar_sources")
      .select("id, display_name, caldav_url, caldav_username")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
    calendarSources = cals ?? []
  }

  return NextResponse.json({
    accounts: list,
    calendarSources,
    config: defaultAcc
      ? {
          provider: defaultAcc.provider,
          oauth_email: defaultAcc.oauth_email,
          smtp_host: defaultAcc.smtp_host,
          smtp_from_email: defaultAcc.smtp_from_email,
          smtp_from_name: defaultAcc.smtp_from_name,
          bcc_self: defaultAcc.bcc_self,
        }
      : null,
    hasConfig: list.length > 0 && !!defaultAcc?.provider,
    tableNotCreated: false,
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const accountsOk = await tableExists(supabase, "email_accounts")
  if (!accountsOk) {
    return NextResponse.json(
      {
        error:
          "Email accounts table not set up. Run scripts/email-accounts-and-calendar-sources.sql in Supabase.",
        tableNotCreated: true,
      },
      { status: 503 }
    )
  }

  const body = await req.json()
  const { action } = body

  if (action === "save_smtp") {
    const {
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      smtp_use_tls,
      bcc_self,
      imap_host,
      imap_port,
      imap_username,
      imap_password,
      imap_use_tls,
      account_id,
    } = body

    const port = parseInt(String(smtp_port), 10) || 587
    const imapPort = imap_port ? parseInt(String(imap_port), 10) : null

    const smtpPayload = {
      provider: "smtp" as const,
      smtp_host,
      smtp_port: port,
      smtp_username,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      smtp_use_tls: smtp_use_tls !== false,
      imap_host: imap_host || null,
      imap_port: imapPort,
      imap_username: imap_username || null,
      imap_password: imap_password || null,
      imap_use_tls: imap_use_tls !== false,
      bcc_self: bcc_self === true,
      updated_at: new Date().toISOString(),
    }

    if (account_id) {
      const { error } = await supabase
        .from("email_accounts")
        .update(smtpPayload)
        .eq("id", account_id)
        .eq("user_id", user.id)
        .eq("provider", "smtp")

      if (error) {
        console.error("Error updating SMTP account:", error)
        return NextResponse.json({ error: "Failed to save SMTP settings" }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    const { data: existingSmtp } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "smtp")
      .limit(1)
      .maybeSingle()

    if (existingSmtp?.id) {
      const { error } = await supabase
        .from("email_accounts")
        .update(smtpPayload)
        .eq("id", existingSmtp.id)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error updating SMTP account:", error)
        return NextResponse.json({ error: "Failed to save SMTP settings" }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    const { data: hasDefault } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default_for_send", true)
      .maybeSingle()

    const { error } = await supabase.from("email_accounts").insert({
      user_id: user.id,
      ...smtpPayload,
      is_default_for_send: !hasDefault,
    })

    if (error) {
      console.error("Error inserting SMTP account:", error)
      return NextResponse.json({ error: "Failed to save SMTP settings" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === "disconnect") {
    const { account_id } = body
    if (!account_id) {
      return NextResponse.json({ error: "account_id required" }, { status: 400 })
    }

    const { data: row } = await supabase
      .from("email_accounts")
      .select("id, is_default_for_send")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("email_accounts")
      .delete()
      .eq("id", account_id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error disconnecting email:", error)
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
    }

    if (row.is_default_for_send) {
      const { data: nextAcc } = await supabase
        .from("email_accounts")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()

      if (nextAcc?.id) {
        await supabase
          .from("email_accounts")
          .update({ is_default_for_send: true, updated_at: new Date().toISOString() })
          .eq("id", nextAcc.id)
          .eq("user_id", user.id)
      }
    }

    return NextResponse.json({ success: true })
  }

  if (action === "set_default") {
    const { account_id } = body
    if (!account_id) {
      return NextResponse.json({ error: "account_id required" }, { status: 400 })
    }

    await supabase
      .from("email_accounts")
      .update({ is_default_for_send: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)

    const { error } = await supabase
      .from("email_accounts")
      .update({ is_default_for_send: true, updated_at: new Date().toISOString() })
      .eq("id", account_id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to set default" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === "toggle_bcc") {
    const { account_id, bcc_self } = body
    if (!account_id) {
      return NextResponse.json({ error: "account_id required" }, { status: 400 })
    }
    const { error } = await supabase
      .from("email_accounts")
      .update({
        bcc_self: bcc_self === true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account_id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error toggling BCC:", error)
      return NextResponse.json({ error: "Failed to update BCC setting" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === "save_caldav") {
    const calOk = await tableExists(supabase, "calendar_sources")
    if (!calOk) {
      return NextResponse.json({ error: "calendar_sources table missing" }, { status: 503 })
    }
    const { display_name, caldav_url, caldav_username, caldav_password, source_id } = body
    if (!caldav_username || !caldav_password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }
    const url = caldav_url || "https://caldav.icloud.com"
    if (source_id) {
      const { error } = await supabase
        .from("calendar_sources")
        .update({
          display_name: display_name || null,
          caldav_url: url,
          caldav_username,
          caldav_password,
          updated_at: new Date().toISOString(),
        })
        .eq("id", source_id)
        .eq("user_id", user.id)
      if (error) {
        return NextResponse.json({ error: "Failed to update calendar" }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }
    const { error } = await supabase.from("calendar_sources").insert({
      user_id: user.id,
      provider: "caldav",
      display_name: display_name || "iCloud",
      caldav_url: url,
      caldav_username,
      caldav_password,
    })
    if (error) {
      return NextResponse.json({ error: "Failed to save calendar" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === "delete_caldav") {
    const { source_id } = body
    if (!source_id) {
      return NextResponse.json({ error: "source_id required" }, { status: 400 })
    }
    const { error } = await supabase
      .from("calendar_sources")
      .delete()
      .eq("id", source_id)
      .eq("user_id", user.id)
    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
