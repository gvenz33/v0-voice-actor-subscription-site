"use client"

import DOMPurify from "isomorphic-dompurify"
import { useMemo } from "react"
import { prepareEmailHtmlForDisplay } from "@/lib/email-display-html"

type EmailHtmlBodyProps = {
  html?: string
  plainText?: string
  className?: string
}

export function EmailHtmlBody({ html, plainText, className }: EmailHtmlBodyProps) {
  const safeHtml = useMemo(() => {
    const raw = prepareEmailHtmlForDisplay(plainText || "", html)
    if (!raw.trim()) return ""
    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "style", "class", "align", "bgcolor", "width", "height", "colspan", "rowspan"],
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    })
  }, [html, plainText])

  if (!safeHtml.trim()) {
    return <p className="text-sm text-muted-foreground">No message content.</p>
  }

  return (
    <div
      className={
        className ??
        "email-body prose prose-sm max-w-none text-sm rounded border border-border bg-white p-4 max-h-[480px] overflow-auto dark:bg-zinc-950 dark:prose-invert [&_img]:max-w-full [&_table]:max-w-full"
      }
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
