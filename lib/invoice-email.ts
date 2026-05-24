import { formatHours, formatUsd, parseInvoiceMeta, computeInvoiceAmount } from "@/lib/invoice-billing"

export function buildInvoiceEmailContent(params: {
  invoiceNumber: string
  amount: number
  dueDate: string | null
  description: string | null
  notes: string | null
  paymentUrl?: string | null
  senderName: string
}) {
  const meta = parseInvoiceMeta(params.notes)
  const billed =
    meta.wordCount && meta.wordCount > 0
      ? computeInvoiceAmount(meta.wordCount, meta.wpm, meta.rateTemplate)
      : null

  const dueLabel = params.dueDate
    ? new Date(
        params.dueDate.includes("T") ? params.dueDate : `${params.dueDate}T12:00:00`
      ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "(not set)"

  const lines = [
    "Hello,",
    "",
    `Please find attached invoice ${params.invoiceNumber} from ${params.senderName}.`,
    "",
    `Invoice #: ${params.invoiceNumber}`,
    `Due date: ${dueLabel}`,
    `Description: ${params.description?.trim() || "(none)"}`,
  ]

  if (meta.wordCount) {
    lines.push(`Word count: ${meta.wordCount.toLocaleString()}`)
    lines.push(`Rate template: ${meta.rateTemplate.toUpperCase()}`)
    lines.push(`WPM: ${meta.wpm}`)
    if (billed) {
      lines.push(`Estimated billed time: ${formatHours(billed.durationHours)}`)
    }
  }

  lines.push("", `Total due: ${formatUsd(params.amount)}`, "")

  if (params.paymentUrl) {
    lines.push(`Pay online: ${params.paymentUrl}`, "")
  }

  lines.push(
    "The invoice is attached as a PDF for your records.",
    "",
    "Thank you,"
  )

  const textBody = lines.join("\n")

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; color: #111;">
      <p>Hello,</p>
      <p>Please find attached invoice <strong>${escapeHtml(params.invoiceNumber)}</strong> from <strong>${escapeHtml(params.senderName)}</strong>.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0;color:#666;">Invoice #</td><td style="padding:6px 0;"><strong>${escapeHtml(params.invoiceNumber)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Due date</td><td style="padding:6px 0;">${escapeHtml(dueLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Description</td><td style="padding:6px 0;">${escapeHtml(params.description?.trim() || "(none)")}</td></tr>
        ${meta.wordCount ? `<tr><td style="padding:6px 0;color:#666;">Word count</td><td style="padding:6px 0;">${meta.wordCount.toLocaleString()}</td></tr>` : ""}
        ${billed ? `<tr><td style="padding:6px 0;color:#666;">Estimated time</td><td style="padding:6px 0;">${escapeHtml(formatHours(billed.durationHours))}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#666;">Total due</td><td style="padding:6px 0;font-size:18px;"><strong>${escapeHtml(formatUsd(params.amount))}</strong></td></tr>
      </table>
      ${
        params.paymentUrl
          ? `<p style="margin: 24px 0;"><a href="${escapeHtml(params.paymentUrl)}" style="display:inline-block;background:#5b21b6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Pay Invoice Online</a></p>
             <p style="font-size:13px;color:#666;">Or copy this link: <a href="${escapeHtml(params.paymentUrl)}">${escapeHtml(params.paymentUrl)}</a></p>`
          : ""
      }
      <p style="color:#666;font-size:14px;">A PDF copy of this invoice is attached to this email.</p>
      <p>Thank you,</p>
    </div>
  `.trim()

  return {
    subject: `Invoice ${params.invoiceNumber} from ${params.senderName}`.trim(),
    textBody,
    htmlBody,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
