import PDFDocument from "pdfkit"
import {
  computeInvoiceAmount,
  formatHours,
  formatUsd,
  parseInvoiceMeta,
  type RateTemplate,
} from "@/lib/invoice-billing"

export type InvoicePdfInput = {
  invoiceNumber: string
  amount: number
  dueDate: string | null
  description: string | null
  notes: string | null
  createdAt?: string | null
  senderName: string
  senderEmail?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export async function generateInvoicePdfBuffer(input: InvoicePdfInput): Promise<Buffer> {
  const meta = parseInvoiceMeta(input.notes)
  const billed =
    meta.wordCount && meta.wordCount > 0
      ? computeInvoiceAmount(meta.wordCount, meta.wpm, meta.rateTemplate)
      : null

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" })
    const chunks: Buffer[] = []

    doc.on("data", (chunk) => chunks.push(chunk as Buffer))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.fontSize(22).font("Helvetica-Bold").text("INVOICE", { align: "right" })
    doc.moveDown(0.5)
    doc.fontSize(10).font("Helvetica").fillColor("#555555")
    doc.text(`Invoice #${input.invoiceNumber}`, { align: "right" })
    doc.text(`Date: ${formatDate(input.createdAt ?? new Date().toISOString())}`, {
      align: "right",
    })
    doc.text(`Due: ${formatDate(input.dueDate)}`, { align: "right" })
    doc.moveDown(2)

    doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text("From")
    doc.font("Helvetica").fontSize(10)
    doc.text(input.senderName)
    if (input.senderEmail) doc.text(input.senderEmail)
    doc.moveDown(1.5)

    doc.font("Helvetica-Bold").text("Bill To")
    doc.font("Helvetica")
    doc.text(meta.clientEmail || "Client")
    doc.moveDown(2)

    const tableTop = doc.y
    doc.font("Helvetica-Bold").fontSize(10)
    doc.text("Description", 50, tableTop)
    doc.text("Amount", 450, tableTop, { width: 100, align: "right" })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#cccccc").stroke()
    doc.moveDown(0.75)

    doc.font("Helvetica").fillColor("#000000")
    const lineDescription =
      input.description?.trim() ||
      `Voice over services (${meta.rateTemplate.toUpperCase()} rate template)`
    doc.text(lineDescription, 50, doc.y, { width: 360 })

    const detailY = doc.y + 14
    if (billed && meta.wordCount) {
      doc.fontSize(9).fillColor("#555555")
      doc.text(`Word count: ${meta.wordCount.toLocaleString()}`, 50, detailY)
      doc.text(`WPM: ${meta.wpm}`, 50, detailY + 12)
      doc.text(`Estimated session: ${formatHours(billed.durationHours)}`, 50, detailY + 24)
    }

    doc.fontSize(10).fillColor("#000000").font("Helvetica-Bold")
    doc.text(formatUsd(input.amount), 450, tableTop + 18, { width: 100, align: "right" })

    doc.moveDown(3)
    const totalY = Math.max(doc.y, detailY + 40)
    doc.moveTo(350, totalY).lineTo(550, totalY).strokeColor("#cccccc").stroke()
    doc.fontSize(12).fillColor("#000000")
    doc.text("Total Due", 350, totalY + 10)
    doc.font("Helvetica-Bold").text(formatUsd(input.amount), 450, totalY + 8, {
      width: 100,
      align: "right",
    })

    if (meta.userNotes) {
      doc.moveDown(2)
      doc.fontSize(10).font("Helvetica-Bold").text("Notes")
      doc.font("Helvetica").fillColor("#333333").text(meta.userNotes, { width: 500 })
    }

    doc.moveDown(3)
    doc.fontSize(9).fillColor("#777777").text("Thank you for your business.", { align: "center" })

    doc.end()
  })
}

export function invoicePdfFilename(invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "")
  return `Invoice-${safe || "document"}.pdf`
}
