const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const RESERVED_CODES = new Set([
  "ADMIN",
  "SUPPORT",
  "VOBIZSUITE",
  "VOBIZ",
  "TEST",
  "FREE",
  "NULL",
  "REF",
])

export function generateAffiliateCode(): string {
  let suffix = ""
  for (let i = 0; i < 8; i++) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return `VOB${suffix}`
}

export function normalizeAffiliateCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function validateCustomAffiliateCode(
  raw: string
): { ok: true; code: string } | { ok: false; error: string } {
  const code = normalizeAffiliateCodeInput(raw)

  if (code.length < 4) {
    return { ok: false, error: "Code must be at least 4 characters (letters and numbers only)." }
  }
  if (code.length > 20) {
    return { ok: false, error: "Code must be 20 characters or fewer." }
  }
  if (!/^[A-Z][A-Z0-9]*$/.test(code)) {
    return {
      ok: false,
      error: "Code must start with a letter and contain only letters and numbers.",
    }
  }
  if (RESERVED_CODES.has(code)) {
    return { ok: false, error: "That code is reserved. Please choose another." }
  }

  return { ok: true, code }
}

export function buildAffiliateReferralUrl(
  code: string,
  siteOrigin?: string | null
): string {
  const base = (siteOrigin || "https://vobizsuite.io").replace(/\/$/, "")
  return `${base}/auth/sign-up?ref=${encodeURIComponent(code)}`
}
