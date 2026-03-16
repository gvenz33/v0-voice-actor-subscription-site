import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("email_config")
    .select("provider, oauth_email, smtp_host, smtp_from_email, smtp_from_name")
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

  const body = await req.json()
  const { action } = body

  if (action === "save_smtp") {
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_use_tls } = body

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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
