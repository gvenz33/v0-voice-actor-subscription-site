const DEFAULT_FROM_EMAIL = "noreply@vobizsuite.io"

/**
 * Shared Resend "from" address for VO Biz Suite transactional mail.
 * Set RESEND_FROM_EMAIL in Vercel (e.g. noreply@vobizsuite.io) once the domain is verified in Resend.
 */
export function getTransactionalFromAddress(
  displayName = "VO Biz Suite",
): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (configured) {
    // If env is a bare email, wrap with display name
    if (configured.includes("<")) return configured
    return `${displayName} <${configured}>`
  }
  return `${displayName} <${DEFAULT_FROM_EMAIL}>`
}
