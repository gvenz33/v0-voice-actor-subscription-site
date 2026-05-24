export function extractEmailAddress(field: string): string {
  const trimmed = field.trim()
  const angle = trimmed.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim().toLowerCase()
  const email = trimmed.match(/[^\s,<>]+@[^\s,<>]+/)
  return (email?.[0] || trimmed).toLowerCase()
}

export function parseAddressList(value: string): string[] {
  if (!value.trim()) return []
  const results: string[] = []
  let current = ""
  let inAngle = false
  for (const char of value) {
    if (char === "<") inAngle = true
    if (char === "," && !inAngle) {
      const addr = extractEmailAddress(current)
      if (addr.includes("@")) results.push(addr)
      current = ""
      continue
    }
    current += char
    if (char === ">") inAngle = false
  }
  const last = extractEmailAddress(current)
  if (last.includes("@")) results.push(last)
  return [...new Set(results)]
}

export function formatReplySubject(subject: string): string {
  const trimmed = subject.trim()
  if (/^re:/i.test(trimmed)) return trimmed
  return `Re: ${trimmed}`
}

export function formatForwardSubject(subject: string): string {
  const trimmed = subject.trim()
  if (/^fwd:/i.test(trimmed) || /^fw:/i.test(trimmed)) return trimmed
  return `Fwd: ${trimmed}`
}

export function buildQuotedText(content: EmailQuoteSource): string {
  const header = [
    "",
    "---------- Original message ----------",
    `From: ${content.from}`,
    content.to ? `To: ${content.to}` : "",
    content.cc ? `Cc: ${content.cc}` : "",
    `Subject: ${content.subject}`,
    "",
  ]
    .filter(Boolean)
    .join("\n")
  const body = content.text || content.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return `${header}${body}`
}

type EmailQuoteSource = {
  from: string
  to: string
  cc: string
  subject: string
  text: string
  html: string
}

export function buildReplyAllRecipients(params: {
  from: string
  to: string
  cc: string
  ownEmails: string[]
}): { to: string; cc: string } {
  const own = new Set(params.ownEmails.map((e) => e.toLowerCase()).filter(Boolean))
  const sender = extractEmailAddress(params.from)
  const all = [
    ...parseAddressList(params.to),
    ...parseAddressList(params.cc),
    sender,
  ].filter((addr) => !own.has(addr))
  const unique = [...new Set(all)]
  const to = unique.includes(sender)
    ? sender
    : unique[0] || sender
  const cc = unique.filter((addr) => addr !== to).join(", ")
  return { to, cc }
}

export function buildReplyRecipients(params: {
  from: string
  ownEmails: string[]
}): string {
  const sender = extractEmailAddress(params.from)
  const own = new Set(params.ownEmails.map((e) => e.toLowerCase()))
  if (own.has(sender)) return ""
  return sender
}
