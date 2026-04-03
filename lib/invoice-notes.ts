const META_MARKER = "VOBizSuite Invoice Meta:"

/** Extract client email from VOBizSuite invoice notes meta block (if present). */
export function parseInvoiceClientEmailFromNotes(notes: string | null | undefined): string | null {
  const notesStr = notes ?? ""
  const idx = notesStr.indexOf(META_MARKER)
  if (idx === -1) return null
  const metaBlock = notesStr.slice(idx)
  const m = metaBlock.match(/Client email:\s*([^\n\r]+)/i)
  return m?.[1]?.trim() || null
}
