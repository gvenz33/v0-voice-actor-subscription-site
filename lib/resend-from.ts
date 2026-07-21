/** Shared Resend "from" address. Prefer verified domain until vobizsuite.io is verified in Resend. */
export function getTransactionalFromAddress(
  displayName = "VO Biz Suite",
): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (configured) {
    // If env is a bare email, wrap with display name
    if (configured.includes("<")) return configured
    return `${displayName} <${configured}>`
  }
  // Fallback: verified sending domain currently on the Resend account
  return `${displayName} <noreply@gotmyrent.com>`
}
