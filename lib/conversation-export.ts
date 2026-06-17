import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx"

export type ExportMessage = {
  role: "user" | "assistant"
  content: string
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    if (paragraph.length <= maxChars) {
      lines.push(paragraph)
      continue
    }
    let remaining = paragraph
    while (remaining.length > maxChars) {
      let breakAt = remaining.lastIndexOf(" ", maxChars)
      if (breakAt <= 0) breakAt = maxChars
      lines.push(remaining.slice(0, breakAt))
      remaining = remaining.slice(breakAt).trimStart()
    }
    if (remaining) lines.push(remaining)
  }
  return lines
}

export async function generateConversationPdfBuffer(params: {
  title: string
  toolLabel: string
  messages: ExportMessage[]
  exportedAt?: Date
}): Promise<Buffer> {
  const { title, toolLabel, messages } = params
  const exportedAt = params.exportedAt ?? new Date()

  const pdf = await PDFDocument.create()
  let page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  let y = height - 50
  const margin = 50
  const lineHeight = 14

  const addPageIfNeeded = (needed: number) => {
    if (y - needed < 50) {
      page = pdf.addPage([612, 792])
      y = height - 50
    }
  }

  page.drawText(title, { x: margin, y, size: 18, font: fontBold })
  y -= 22
  page.drawText(toolLabel, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) })
  y -= 14
  page.drawText(
    `Exported ${exportedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) },
  )
  y -= 24

  for (const message of messages) {
    if (!message.content.trim()) continue
    const label = message.role === "user" ? "You" : "Assistant"
    addPageIfNeeded(40)
    page.drawText(label, { x: margin, y, size: 11, font: fontBold })
    y -= lineHeight

    for (const line of wrapText(message.content, 90)) {
      addPageIfNeeded(lineHeight)
      page.drawText(line, { x: margin + 8, y, size: 10, font })
      y -= lineHeight
    }
    y -= 10
  }

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

export async function generateConversationDocxBuffer(params: {
  title: string
  toolLabel: string
  messages: ExportMessage[]
  exportedAt?: Date
}): Promise<Buffer> {
  const { title, toolLabel, messages } = params
  const exportedAt = params.exportedAt ?? new Date()

  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: toolLabel, italics: true, color: "666666" }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported ${exportedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
          size: 18,
          color: "888888",
        }),
      ],
      spacing: { after: 300 },
    }),
  ]

  for (const message of messages) {
    if (!message.content.trim()) continue
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: message.role === "user" ? "You" : "Assistant",
            bold: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
      }),
    )
    for (const paragraph of message.content.split("\n")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: paragraph || " " })],
          alignment: AlignmentType.LEFT,
        }),
      )
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}

export function conversationExportFilename(title: string, format: "pdf" | "docx") {
  const safe = title
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return `${safe || "conversation"}.${format}`
}
