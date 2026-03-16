import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`
  : "http://localhost:3000/api/auth/outlook/callback"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=outlook_auth_failed", req.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Outlook token exchange failed:", tokens)
      return NextResponse.redirect(new URL("/dashboard/settings?error=outlook_token_failed", req.url))
    }

    // Get user's email from Microsoft Graph
    const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoRes.json()

    // Save to database
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=not_authenticated", req.url))
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

    const { error: dbError } = await supabase.from("email_config").upsert({
      user_id: user.id,
      provider: "outlook",
      oauth_access_token: tokens.access_token,
      oauth_refresh_token: tokens.refresh_token,
      oauth_expires_at: expiresAt.toISOString(),
      oauth_email: userInfo.mail || userInfo.userPrincipalName,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

    if (dbError) {
      console.error("Failed to save Outlook tokens:", dbError)
      return NextResponse.redirect(new URL("/dashboard/settings?error=outlook_save_failed", req.url))
    }

    return NextResponse.redirect(new URL("/dashboard/settings?success=outlook_connected", req.url))
  } catch (err) {
    console.error("Outlook OAuth error:", err)
    return NextResponse.redirect(new URL("/dashboard/settings?error=outlook_error", req.url))
  }
}
