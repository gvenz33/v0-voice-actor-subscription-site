import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  countEmailAccountsForUser,
  MAX_EMAIL_ACCOUNTS_PER_USER,
} from "@/lib/email-account-limits"
import { oauthCompleteUrl, outlookRedirectUri } from "@/lib/oauth-config"

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(oauthCompleteUrl({ error: "outlook_auth_failed" }, req.url))
  }

  try {
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        redirect_uri: outlookRedirectUri(),
        grant_type: "authorization_code",
      }),
    })

    const tokens = (await tokenRes.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }

    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Outlook token exchange failed:", tokens)
      return NextResponse.redirect(oauthCompleteUrl({ error: "outlook_token_failed" }, req.url))
    }

    const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = (await userInfoRes.json()) as {
      mail?: string
      userPrincipalName?: string
    }

    const oauthEmail = userInfo.mail || userInfo.userPrincipalName
    if (!oauthEmail) {
      return NextResponse.redirect(oauthCompleteUrl({ error: "outlook_save_failed" }, req.url))
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=not_authenticated", req.url))
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

    const { data: existing } = await supabase
      .from("email_accounts")
      .select("id, oauth_refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "outlook")
      .eq("oauth_email", oauthEmail)
      .maybeSingle()

    const { data: defaultHolder } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default_for_send", true)
      .maybeSingle()

    const refreshToken =
      tokens.refresh_token ?? existing?.oauth_refresh_token ?? null

    const baseUpdate = {
      oauth_access_token: tokens.access_token,
      oauth_refresh_token: refreshToken,
      oauth_expires_at: expiresAt.toISOString(),
      oauth_email: oauthEmail,
      provider: "outlook" as const,
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const { error: dbError } = await supabase
        .from("email_accounts")
        .update(baseUpdate)
        .eq("id", existing.id)
        .eq("user_id", user.id)

      if (dbError) {
        console.error("Failed to save Outlook tokens:", dbError)
        return NextResponse.redirect(oauthCompleteUrl({ error: "outlook_save_failed" }, req.url))
      }
    } else {
      const n = await countEmailAccountsForUser(supabase, user.id)
      if (n >= MAX_EMAIL_ACCOUNTS_PER_USER) {
        return NextResponse.redirect(
          oauthCompleteUrl({ error: "max_email_accounts" }, req.url),
        )
      }
      const { error: dbError } = await supabase.from("email_accounts").insert({
        user_id: user.id,
        ...baseUpdate,
        is_default_for_send: !defaultHolder,
      })

      if (dbError) {
        console.error("Failed to save Outlook tokens:", dbError)
        return NextResponse.redirect(oauthCompleteUrl({ error: "outlook_save_failed" }, req.url))
      }
    }

    return NextResponse.redirect(oauthCompleteUrl({ success: "outlook_connected" }, req.url))
  } catch (err) {
    console.error("Outlook OAuth error:", err)
    return NextResponse.redirect(oauthCompleteUrl({ error: "outlook_error" }, req.url))
  }
}
