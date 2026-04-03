import type { SupabaseClient } from "@supabase/supabase-js"
import type { EmailAccountRow } from "@/lib/email-account-types"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

function tokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() < Date.now() + 60_000
}

export async function ensureGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow
): Promise<string> {
  if (row.provider !== "gmail") {
    throw new Error("Not a Gmail account")
  }
  let accessToken = row.oauth_access_token
  if (!tokenExpired(row.oauth_expires_at) && accessToken) {
    return accessToken
  }
  if (!row.oauth_refresh_token) {
    throw new Error("Gmail session expired. Reconnect in Settings.")
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured")
  }
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: row.oauth_refresh_token,
      grant_type: "refresh_token",
    }),
  })
  const refreshData = (await refreshRes.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
  }
  if (!refreshData.access_token) {
    throw new Error(refreshData.error || "Failed to refresh Google token")
  }
  accessToken = refreshData.access_token
  const expiresAt = new Date(
    Date.now() + (refreshData.expires_in ?? 3600) * 1000
  ).toISOString()
  await supabase
    .from("email_accounts")
    .update({
      oauth_access_token: accessToken,
      oauth_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("user_id", userId)
  return accessToken
}

export async function ensureMicrosoftAccessToken(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow
): Promise<string> {
  if (row.provider !== "outlook") {
    throw new Error("Not an Outlook account")
  }
  let accessToken = row.oauth_access_token
  if (!tokenExpired(row.oauth_expires_at) && accessToken) {
    return accessToken
  }
  if (!row.oauth_refresh_token) {
    throw new Error("Outlook session expired. Reconnect in Settings.")
  }
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth is not configured")
  }
  const refreshRes = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: row.oauth_refresh_token,
        grant_type: "refresh_token",
      }),
    }
  )
  const refreshData = (await refreshRes.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
  }
  if (!refreshData.access_token) {
    throw new Error(refreshData.error || "Failed to refresh Microsoft token")
  }
  accessToken = refreshData.access_token
  const expiresAt = new Date(
    Date.now() + (refreshData.expires_in ?? 3600) * 1000
  ).toISOString()
  await supabase
    .from("email_accounts")
    .update({
      oauth_access_token: accessToken,
      oauth_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("user_id", userId)
  return accessToken
}
