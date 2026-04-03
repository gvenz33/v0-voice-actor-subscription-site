"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

/**
 * Reads OAuth redirect query params. Kept separate so the parent settings UI
 * renders immediately; only this subtree may suspend for useSearchParams().
 */
export function OAuthCallbackMessages({
  onGmailConnected,
  onOutlookConnected,
  onOAuthError,
}: {
  onGmailConnected: () => void
  onOutlookConnected: () => void
  onOAuthError: (message: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success === "gmail_connected") {
      onGmailConnected()
    } else if (success === "outlook_connected") {
      onOutlookConnected()
    } else if (error) {
      onOAuthError(`Connection failed: ${error.replace(/_/g, " ")}`)
    }
  }, [searchParams, onGmailConnected, onOutlookConnected, onOAuthError])

  return null
}
