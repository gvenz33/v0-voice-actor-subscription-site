import { NextResponse } from "next/server"
import {
  isOutlookOAuthConfigured,
  oauthCompleteUrl,
  OAUTH_POPUP_STATE,
  outlookRedirectUri,
  wantsPopup,
} from "@/lib/oauth-config"

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID

export async function GET(req: Request) {
  if (!isOutlookOAuthConfigured()) {
    return NextResponse.redirect(
      oauthCompleteUrl({ error: "outlook_not_configured" }, req.url),
    )
  }

  const scopes = [
    "openid",
    "email",
    "offline_access",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/Calendars.Read",
  ].join(" ")

  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
  authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID!)
  authUrl.searchParams.set("redirect_uri", outlookRedirectUri())
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scopes)
  authUrl.searchParams.set("response_mode", "query")
  if (wantsPopup(req)) {
    authUrl.searchParams.set("state", OAUTH_POPUP_STATE)
  }

  return NextResponse.redirect(authUrl.toString())
}
