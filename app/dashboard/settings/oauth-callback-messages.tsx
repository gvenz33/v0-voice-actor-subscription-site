"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { MAX_EMAIL_ACCOUNTS_PER_USER } from "@/lib/email-account-limits"

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
      if (error === "max_email_accounts") {
        onOAuthError(
          `You can connect up to ${MAX_EMAIL_ACCOUNTS_PER_USER} mailboxes. Disconnect one to add another.`
        )
      } else {
        onOAuthError(`Connection failed: ${error.replace(/_/g, " ")}`)
      }
    }
  }, [searchParams, onGmailConnected, onOutlookConnected, onOAuthError])

  return null
}
