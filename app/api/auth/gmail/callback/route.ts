import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  : "http://localhost:3000/api/auth/gmail/callback"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=gmail_auth_failed", req.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Gmail token exchange failed:", tokens)
      return NextResponse.redirect(new URL("/dashboard/settings?error=gmail_token_failed", req.url))
    }

    // Get user's email
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
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
      provider: "gmail",
      oauth_access_token: tokens.access_token,
      oauth_refresh_token: tokens.refresh_token,
      oauth_expires_at: expiresAt.toISOString(),
      oauth_email: userInfo.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

    if (dbError) {
      console.error("Failed to save Gmail tokens:", dbError)
      return NextResponse.redirect(new URL("/dashboard/settings?error=gmail_save_failed", req.url))
    }

    return NextResponse.redirect(new URL("/dashboard/settings?success=gmail_connected", req.url))
  } catch (err) {
    console.error("Gmail OAuth error:", err)
    return NextResponse.redirect(new URL("/dashboard/settings?error=gmail_error", req.url))
  }
}
