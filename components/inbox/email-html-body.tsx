"use client"

type EmailHtmlBodyProps = {
  html: string
  className?: string
}

export function EmailHtmlBody({ html, className }: EmailHtmlBodyProps) {
  if (!html.trim()) {
    return <p className="text-sm text-muted-foreground">No message content.</p>
  }

  return (
    <iframe
      title="Email message"
      sandbox=""
      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>
        body { font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #111; margin: 0; padding: 0; word-break: break-word; }
        img { max-width: 100%; height: auto; }
        a { color: #2563eb; }
        blockquote { margin: 0.5em 0; padding-left: 1em; border-left: 3px solid #ddd; color: #555; }
      </style></head><body>${html}</body></html>`}
      className={className ?? "w-full min-h-[280px] max-h-[420px] rounded border border-border bg-white"}
    />
  )
}
