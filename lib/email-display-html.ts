export function looksLikeHtml(content: string): boolean {
  return /<\s*\/?\s*(html|body|head|br|p|div|span|table|tr|td|th|a|img|style|meta|h[1-6]|ul|ol|li|strong|em|b|i)\b[^>]*>/i.test(
    content
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function prepareEmailHtmlForDisplay(text: string, html?: string): string {
  const htmlPart = html?.trim() || ""
  if (htmlPart) return htmlPart

  const textPart = text?.trim() || ""
  if (!textPart) return ""

  if (looksLikeHtml(textPart)) return textPart

  return textPart
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join("<br>")
}
