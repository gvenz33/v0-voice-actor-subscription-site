import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Helper to ensure the email_config table exists
async function ensureTable(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Check if table exists by trying a simple query
  const { error } = await supabase.from("email_config").select("id").limit(1)
  
  if (error?.code === "PGRST205" || error?.message?.includes("does not exist")) {
    // Table doesn't exist - we need to create it via SQL Editor in Supabase Dashboard
    // Return a helpful error instead of crashing
    return false
  }
  return true
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Check if table exists
  const tableExists = await ensureTable(supabase)
  if (!tableExists) {
    // Return empty config - user can still use mailto: fallback
    return NextResponse.json({
      config: null,
      hasConfig: false,
      tableNotCreated: true,
    })
  }

  const { data, error } = await supabase
    .from("email_config")
    .select("provider, oauth_email, smtp_host, smtp_from_email, smtp_from_name, bcc_self")
    .eq("user_id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned, which is fine
    console.error("Error fetching email config:", error)
  }

  return NextResponse.json({
    config: data || null,
    hasConfig: !!data?.provider,
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Check if table exists
  const tableExists = await ensureTable(supabase)
  if (!tableExists) {
    return NextResponse.json({ 
      error: "Email configuration table not set up. Please run the migration in Supabase SQL Editor.",
      tableNotCreated: true,
    }, { status: 503 })
  }

  const body = await req.json()
  const { action } = body

  if (action === "save_smtp") {
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_use_tls, bcc_self } = body

    // Upsert SMTP config
    const { error } = await supabase.from("email_config").upsert({
      user_id: user.id,
      provider: "smtp",
      smtp_host,
      smtp_port: parseInt(smtp_port) || 587,
      smtp_username,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      smtp_use_tls: smtp_use_tls !== false,
      bcc_self: bcc_self === true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

    if (error) {
      console.error("Error saving SMTP config:", error)
      return NextResponse.json({ error: "Failed to save SMTP settings" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === "disconnect") {
    const { error } = await supabase
      .from("email_config")
      .delete()
      .eq("user_id", user.id)

    if (error) {
      console.error("Error disconnecting email:", error)
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === "toggle_bcc") {
    const { bcc_self } = body
    const { error } = await supabase
      .from("email_config")
      .update({ bcc_self: bcc_self === true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)

    if (error) {
      console.error("Error toggling BCC:", error)
      return NextResponse.json({ error: "Failed to update BCC setting" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
