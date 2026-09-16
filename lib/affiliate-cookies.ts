export const AFFILIATE_REF_COOKIE = "vobiz_ref"
export const AFFILIATE_INTENT_COOKIE = "vobiz_affiliate_intent"
export const AFFILIATE_REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=")
    if (rawKey === name) {
      try {
        return decodeURIComponent(rest.join("="))
      } catch {
        return rest.join("=") || null
      }
    }
  }
  return null
}
