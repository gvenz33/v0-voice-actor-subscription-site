import { NextResponse } from "next/server"

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`
  : "http://localhost:3000/api/auth/outlook/callback"

export async function GET() {
  if (!MICROSOFT_CLIENT_ID) {
    return NextResponse.json({ error: "Outlook OAuth not configured" }, { status: 500 })
  }

  const scopes = [
    "openid",
    "email",
    "offline_access",
    "https://graph.microsoft.com/Mail.Send",
  ].join(" ")

  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
  authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scopes)
  authUrl.searchParams.set("response_mode", "query")

  return NextResponse.redirect(authUrl.toString())
}
