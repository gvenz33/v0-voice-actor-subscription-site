export type InvoicePaymentProfile = {
  payment_zelle?: string | null
  payment_venmo?: string | null
  payment_paypal?: string | null
  payment_other?: string | null
}

export function formatPaymentInstructionsForEmail(
  profile: InvoicePaymentProfile | null | undefined
): { textBlock: string; htmlBlock: string; hasAny: boolean } {
  const lines: string[] = []
  const zelle = profile?.payment_zelle?.trim()
  const venmo = profile?.payment_venmo?.trim()
  const paypal = profile?.payment_paypal?.trim()
  const other = profile?.payment_other?.trim()

  if (zelle) lines.push(`Zelle: ${zelle}`)
  if (venmo) lines.push(`Venmo: ${venmo.startsWith("@") ? venmo : `@${venmo.replace(/^@/, "")}`}`)
  if (paypal) lines.push(`PayPal: ${paypal}`)
  if (other) lines.push(other)

  if (!lines.length) {
    return { textBlock: "", htmlBlock: "", hasAny: false }
  }

  const textBlock = ["Payment options:", ...lines.map((l) => `  • ${l}`)].join("\n")

  const htmlItems = lines
    .map((l) => `<li style="margin:4px 0;">${escapeHtml(l)}</li>`)
    .join("")

  const htmlBlock = `
    <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:600;color:#111;">How to pay this invoice</p>
      <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;">${htmlItems}</ul>
      <p style="margin:12px 0 0;font-size:12px;color:#64748b;">Include your invoice number in the payment memo when possible.</p>
    </div>
  `.trim()

  return { textBlock, htmlBlock, hasAny: true }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function paymentInstructionsPlainLines(
  profile: InvoicePaymentProfile | null | undefined
): string[] {
  const { textBlock, hasAny } = formatPaymentInstructionsForEmail(profile)
  if (!hasAny) return []
  return textBlock.split("\n")
}
