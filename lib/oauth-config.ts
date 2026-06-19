export const OAUTH_POPUP_STATE = "popup"

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
}

export function gmailRedirectUri() {
  return `${getAppUrl()}/api/auth/gmail/callback`
}

export function outlookRedirectUri() {
  return `${getAppUrl()}/api/auth/outlook/callback`
}

export function isGmailOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
}

export function isOutlookOAuthConfigured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim())
}

export function oauthCompletePath(params: Record<string, string>) {
  const search = new URLSearchParams(params)
  return `/dashboard/settings/oauth-complete?${search.toString()}`
}

export function oauthCompleteUrl(params: Record<string, string>, requestUrl?: string) {
  const base = requestUrl ? new URL(requestUrl).origin : getAppUrl()
  return `${base}${oauthCompletePath(params)}`
}

export function wantsPopup(req: Request) {
  const url = new URL(req.url)
  return url.searchParams.get("popup") === "1"
}

export function isPopupOAuthState(state: string | null | undefined) {
  return state === OAUTH_POPUP_STATE
}
