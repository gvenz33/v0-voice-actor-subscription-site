import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import {
  computeInvoiceAmount,
  formatHours,
  formatUsd,
  parseInvoiceMeta,
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
  /** Extra lines from email signature / business info for letterhead */
  letterheadLines?: string[]
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

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  let y = height - 50

  page.drawText("INVOICE", {
    x: width - 150,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  y -= 24
  page.drawText(`Invoice #${input.invoiceNumber}`, {
    x: width - 200,
    y,
    size: 10,
    font,
    color: rgb(0.33, 0.33, 0.33),
  })
  y -= 14
  page.drawText(`Date: ${formatDate(input.createdAt ?? new Date().toISOString())}`, {
    x: width - 200,
    y,
    size: 10,
    font,
    color: rgb(0.33, 0.33, 0.33),
  })
  y -= 14
  page.drawText(`Due: ${formatDate(input.dueDate)}`, {
    x: width - 200,
    y,
    size: 10,
    font,
    color: rgb(0.33, 0.33, 0.33),
  })

  // Letterhead — company name, accent rule, then contact lines
  let letterheadY = height - 72
  page.drawText(input.senderName, { x: 50, y: letterheadY, size: 14, font: fontBold })
  letterheadY -= 8
  page.drawLine({
    start: { x: 50, y: letterheadY },
    end: { x: 280, y: letterheadY },
    thickness: 2,
    color: rgb(0.45, 0.35, 0.75),
  })
  letterheadY -= 18
  if (input.senderEmail) {
    page.drawText(input.senderEmail, { x: 50, y: letterheadY, size: 10, font, color: rgb(0.33, 0.33, 0.33) })
    letterheadY -= 14
  }
  for (const line of input.letterheadLines ?? []) {
    page.drawText(line.slice(0, 70), { x: 50, y: letterheadY, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
    letterheadY -= 12
  }

  y = letterheadY - 20
  page.drawText("Bill To", { x: 50, y, size: 11, font: fontBold })
  y -= 16
  page.drawText(meta.clientEmail || "Client", { x: 50, y, size: 10, font })

  y -= 40
  page.drawText("Description", { x: 50, y, size: 10, font: fontBold })
  page.drawText("Amount", { x: width - 100, y, size: 10, font: fontBold })
  y -= 8
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 20

  const lineDescription =
    input.description?.trim() ||
    `Voice over services (${meta.rateTemplate.toUpperCase()} rate template)`
  page.drawText(lineDescription.slice(0, 80), { x: 50, y, size: 10, font })
  page.drawText(formatUsd(input.amount), {
    x: width - 100,
    y,
    size: 10,
    font: fontBold,
  })

  if (billed && meta.wordCount) {
    y -= 16
    page.drawText(`Word count: ${meta.wordCount.toLocaleString()}`, {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.33, 0.33, 0.33),
    })
    y -= 12
    page.drawText(`WPM: ${meta.wpm}`, { x: 50, y, size: 9, font, color: rgb(0.33, 0.33, 0.33) })
    y -= 12
    page.drawText(`Estimated session: ${formatHours(billed.durationHours)}`, {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.33, 0.33, 0.33),
    })
  }

  y -= 36
  page.drawLine({
    start: { x: 350, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 18
  page.drawText("Total Due", { x: 350, y, size: 12, font })
  page.drawText(formatUsd(input.amount), {
    x: width - 100,
    y,
    size: 12,
    font: fontBold,
  })

  if (meta.userNotes) {
    y -= 36
    page.drawText("Notes", { x: 50, y, size: 10, font: fontBold })
    y -= 16
    const noteLines = meta.userNotes.match(/.{1,90}/g) ?? [meta.userNotes]
    for (const line of noteLines.slice(0, 8)) {
      page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
      y -= 14
    }
  }

  page.drawText("Thank you for your business.", {
    x: width / 2 - 80,
    y: 40,
    size: 9,
    font,
    color: rgb(0.47, 0.47, 0.47),
  })

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

export function invoicePdfFilename(invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "")
  return `Invoice-${safe || "document"}.pdf`
}
