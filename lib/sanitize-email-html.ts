import DOMPurify from "isomorphic-dompurify"

export function sanitizeEmailHtml(html: string): string {
  if (!html.trim()) return ""
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  })
}
