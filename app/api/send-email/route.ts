import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { to, subject, body } = await req.json()

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields: to, subject, body" }, { status: 400 })
  }

  // Get user's email config
  const { data: config, error: configError } = await supabase
    .from("email_config")
    .select("*")
    .eq("user_id", user.id)
    .single()

  console.log("[v0] Send email - config fetch result:", { config: !!config, error: configError?.message || configError?.code })

  if (configError) {
    // Check if table doesn't exist
    if (configError.code === "PGRST205") {
      return NextResponse.json({ 
        error: "Email configuration table not set up. Please run the database migration in Settings, or use 'Open in Mail App' instead." 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: "No email account configured. Please connect Gmail, Outlook, or configure SMTP in Settings." 
    }, { status: 400 })
  }
  
  if (!config) {
    return NextResponse.json({ 
      error: "No email account configured. Please connect Gmail, Outlook, or configure SMTP in Settings." 
    }, { status: 400 })
  }
  
  console.log("[v0] Send email - using provider:", config.provider)

  try {
    if (config.provider === "gmail") {
      // Refresh token if expired
      let accessToken = config.oauth_access_token
      if (new Date(config.oauth_expires_at) < new Date()) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: config.oauth_refresh_token,
            grant_type: "refresh_token",
          }),
        })
        const refreshData = await refreshRes.json()
        if (refreshData.access_token) {
          accessToken = refreshData.access_token
          // Update stored token
          await supabase.from("email_config").update({
            oauth_access_token: accessToken,
            oauth_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          }).eq("user_id", user.id)
        }
      }

      // Send via Gmail API
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        "",
        body,
      ].join("\n")

      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")

      const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      })

      if (!sendRes.ok) {
        const err = await sendRes.json()
        throw new Error(err.error?.message || "Gmail send failed")
      }

      return NextResponse.json({ success: true, provider: "gmail", from: config.oauth_email })
    }

    if (config.provider === "outlook") {
      // Refresh token if expired
      let accessToken = config.oauth_access_token
      if (new Date(config.oauth_expires_at) < new Date()) {
        const refreshRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            refresh_token: config.oauth_refresh_token,
            grant_type: "refresh_token",
          }),
        })
        const refreshData = await refreshRes.json()
        if (refreshData.access_token) {
          accessToken = refreshData.access_token
          await supabase.from("email_config").update({
            oauth_access_token: accessToken,
            oauth_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          }).eq("user_id", user.id)
        }
      }

      // Send via Microsoft Graph API
      const sendRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: "Text", content: body },
            toRecipients: [{ emailAddress: { address: to } }],
          },
        }),
      })

      if (!sendRes.ok) {
        const err = await sendRes.json()
        throw new Error(err.error?.message || "Outlook send failed")
      }

      return NextResponse.json({ success: true, provider: "outlook", from: config.oauth_email })
    }

    if (config.provider === "smtp") {
      // Send via SMTP using nodemailer
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port || 587,
        secure: config.smtp_port === 465,
        auth: {
          user: config.smtp_username,
          pass: config.smtp_password,
        },
      })

      await transporter.sendMail({
        from: config.smtp_from_name 
          ? `"${config.smtp_from_name}" <${config.smtp_from_email}>`
          : config.smtp_from_email,
        to,
        subject,
        text: body,
      })

      return NextResponse.json({ success: true, provider: "smtp", from: config.smtp_from_email })
    }

    return NextResponse.json({ error: "Unknown email provider" }, { status: 400 })
  } catch (err) {
    console.error("Send email error:", err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to send email" 
    }, { status: 500 })
  }
}
