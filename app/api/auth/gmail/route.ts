import { NextResponse } from "next/server"
import {
  gmailRedirectUri,
  isGmailOAuthConfigured,
  oauthCompleteUrl,
  OAUTH_POPUP_STATE,
  wantsPopup,
} from "@/lib/oauth-config"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

export async function GET(req: Request) {
  if (!isGmailOAuthConfigured()) {
    return NextResponse.redirect(
      oauthCompleteUrl({ error: "gmail_not_configured" }, req.url),
    )
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ")

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID!)
  authUrl.searchParams.set("redirect_uri", gmailRedirectUri())
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scopes)
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")
  if (wantsPopup(req)) {
    authUrl.searchParams.set("state", OAUTH_POPUP_STATE)
  }

  return NextResponse.redirect(authUrl.toString())
}
