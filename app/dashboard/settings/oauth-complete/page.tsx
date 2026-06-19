"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, AlertCircle } from "lucide-react"
import Link from "next/link"

const SUCCESS_LABELS: Record<string, string> = {
  gmail_connected: "Google Gmail connected successfully.",
  outlook_connected: "Microsoft 365 (Outlook) connected successfully.",
}

const ERROR_LABELS: Record<string, string> = {
  gmail_not_configured:
    "Gmail OAuth is not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Vercel environment variables.",
  outlook_not_configured:
    "Outlook OAuth is not configured on the server. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to Vercel environment variables.",
  gmail_auth_failed: "Google sign-in was cancelled or denied.",
  outlook_auth_failed: "Microsoft sign-in was cancelled or denied.",
  gmail_token_failed: "Could not complete Gmail authorization. Try again.",
  outlook_token_failed: "Could not complete Outlook authorization. Try again.",
  gmail_save_failed: "Gmail connected but saving the account failed. Try again.",
  outlook_save_failed: "Outlook connected but saving the account failed. Try again.",
  gmail_error: "An unexpected error occurred connecting Gmail.",
  outlook_error: "An unexpected error occurred connecting Outlook.",
  max_email_accounts: "Mailbox limit reached. Disconnect an account in Settings first.",
}

function OAuthCompleteContent() {
  const searchParams = useSearchParams()
  const [openedAsPopup, setOpenedAsPopup] = useState(false)

  const success = searchParams.get("success")
  const error = searchParams.get("error")
  const isSuccess = Boolean(success)
  const message = success
    ? SUCCESS_LABELS[success] ?? "Email account connected."
    : ERROR_LABELS[error ?? ""] ??
      (error ? `Connection failed: ${error.replace(/_/g, " ")}` : "No result received.")

  useEffect(() => {
    const hasOpener = Boolean(window.opener && !window.opener.closed)
    setOpenedAsPopup(hasOpener)

    const payload = {
      type: "vob-oauth-complete",
      success,
      error,
    }

    if (hasOpener) {
      window.opener!.postMessage(payload, window.location.origin)
      return
    }

    if (!success && !error) return

    const q = new URLSearchParams()
    if (success) q.set("success", success)
    if (error) q.set("error", error)
    window.location.replace(`/dashboard/settings?${q.toString()}`)
  }, [success, error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isSuccess ? (
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-500/10">
              <Check className="size-6 text-green-600" />
            </div>
          ) : (
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>
          )}
          <CardTitle>{isSuccess ? "Connected" : "Connection issue"}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-center">
          {openedAsPopup ? (
            <p className="text-sm text-muted-foreground">
              You can close this tab and return to VO Biz Suite Settings.
            </p>
          ) : (
            <Button asChild>
              <Link href="/dashboard/settings">Back to Settings</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Finishing connection…</div>}>
      <OAuthCompleteContent />
    </Suspense>
  )
}
