"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { MAX_EMAIL_ACCOUNTS_PER_USER } from "@/lib/email-account-limits"
import { createClient } from "@/lib/supabase/client"
import { OAuthCallbackMessages } from "./oauth-callback-messages"
import { DemoReelsSettings } from "@/components/settings/demo-reels-settings"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { User, CreditCard, Shield, Mail, Check, AlertCircle, Loader2, Unlink, FileSignature, Save, Calendar, Inbox } from "lucide-react"
import Link from "next/link"

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_tier: string
  experience_level: string | null
}

interface EmailConfig {
  provider: string | null
  oauth_email: string | null
  smtp_host: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  bcc_self?: boolean
}

interface EmailAccountRow {
  id: string
  provider: string | null
  label: string | null
  oauth_email: string | null
  smtp_host: string | null
  smtp_port?: number | null
  smtp_username?: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_use_tls?: boolean
  bcc_self?: boolean
  is_default_for_send?: boolean
  imap_host?: string | null
  imap_port?: number | null
  imap_username?: string | null
  imap_use_tls?: boolean
}

interface CalendarSourceRow {
  id: string
  display_name: string | null
  caldav_url: string
  caldav_username: string
}

export function SettingsForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  
  // Email config state
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountRow[]>([])
  const [calendarSources, setCalendarSources] = useState<CalendarSourceRow[]>([])
  const [emailConfigLoading, setEmailConfigLoading] = useState(true)
  const [emailTableNotCreated, setEmailTableNotCreated] = useState(false)
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "",
    smtp_use_tls: true,
    imap_host: "",
    imap_port: "993",
    imap_username: "",
    imap_password: "",
    imap_use_tls: true,
    smtp_account_id: "" as string,
  })
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [emailMessage, setEmailMessage] = useState("")

  const [caldavForm, setCaldavForm] = useState({
    display_name: "iCloud",
    caldav_url: "https://caldav.icloud.com",
    caldav_username: "",
    caldav_password: "",
    source_id: "",
  })
  const [caldavSaving, setCaldavSaving] = useState(false)
  
  // Signature state
  const [signature, setSignature] = useState("")
  const [signatureLoading, setSignatureLoading] = useState(true)
  const [signatureSaving, setSignatureSaving] = useState(false)
  const [signatureMessage, setSignatureMessage] = useState("")

  const smtpAccountsOnly = useMemo(
    () => emailAccounts.filter((a) => a.provider === "smtp"),
    [emailAccounts]
  )

  const applySmtpAccountToForm = useCallback((acc: EmailAccountRow | "new") => {
    if (acc === "new") {
      setSmtpForm((f) => ({
        ...f,
        smtp_account_id: "",
        smtp_host: "",
        smtp_port: "587",
        smtp_username: "",
        smtp_password: "",
        smtp_from_email: "",
        smtp_from_name: "",
        smtp_use_tls: true,
        imap_host: "",
        imap_port: "993",
        imap_username: "",
        imap_password: "",
        imap_use_tls: true,
      }))
      return
    }
    setSmtpForm((f) => ({
      ...f,
      smtp_account_id: acc.id,
      smtp_host: acc.smtp_host ?? "",
      smtp_port: acc.smtp_port != null ? String(acc.smtp_port) : "587",
      smtp_username: acc.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: acc.smtp_from_email ?? "",
      smtp_from_name: acc.smtp_from_name ?? "",
      smtp_use_tls: acc.smtp_use_tls !== false,
      imap_host: acc.imap_host ?? "",
      imap_port: acc.imap_port != null ? String(acc.imap_port) : "993",
      imap_username: acc.imap_username ?? "",
      imap_password: "",
      imap_use_tls: acc.imap_use_tls !== false,
    }))
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || "")
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) setProfile(data)
    }
    load()
  }, [])

  // Load email config
  useEffect(() => {
    async function loadEmailConfig() {
      try {
        const res = await fetch("/api/email-config", {
          credentials: "same-origin",
          cache: "no-store",
        })
        const data = (await res.json().catch(() => ({}))) as {
          config?: EmailConfig | null
          accounts?: EmailAccountRow[]
          calendarSources?: CalendarSourceRow[]
          tableNotCreated?: boolean
          error?: string
        }
        if (!res.ok) {
          if (res.status === 401) {
            setEmailMessage("Sign in again to load email settings.")
            setEmailTableNotCreated(false)
          } else if (data.tableNotCreated) {
            setEmailTableNotCreated(true)
          } else if (data.error) {
            setEmailMessage(data.error)
            setEmailTableNotCreated(false)
          } else {
            setEmailTableNotCreated(false)
          }
          return
        }
        setEmailConfig(data.config ?? null)
        setEmailAccounts(data.accounts ?? [])
        setCalendarSources(data.calendarSources ?? [])
        setEmailTableNotCreated(data.tableNotCreated === true)
        const smtpList = (data.accounts ?? []).filter(
          (a: EmailAccountRow) => a.provider === "smtp"
        )
        const smtpAcc =
          smtpList.find((a) => a.is_default_for_send) ?? smtpList[0]
        if (smtpAcc) {
          applySmtpAccountToForm(smtpAcc)
        } else {
          applySmtpAccountToForm("new")
        }
        const cal = (data.calendarSources ?? [])[0] as CalendarSourceRow | undefined
        if (cal) {
          setCaldavForm((f) => ({
            ...f,
            source_id: cal.id,
            display_name: cal.display_name || "iCloud",
            caldav_url: cal.caldav_url,
            caldav_username: cal.caldav_username,
          }))
        }
      } catch {
        console.error("Failed to load email config")
        setEmailMessage("Could not load email settings. Refresh and try again.")
      } finally {
        setEmailConfigLoading(false)
      }
    }
    loadEmailConfig()
  }, [applySmtpAccountToForm])

  // Load signature from database (fallback to localStorage)
  useEffect(() => {
    async function loadSignature() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let saved = ""
      if (user) {
        const { data } = await supabase
          .from("email_signatures")
          .select("signature_text")
          .eq("user_id", user.id)
          .maybeSingle()
        saved = data?.signature_text ?? ""
      }

      if (!saved) {
        saved = localStorage.getItem("vo_email_signature") || ""
      }

      setSignature(saved)
      setSignatureLoading(false)
    }

    void loadSignature()
  }, [])

  const onGmailConnected = useCallback(() => {
    setEmailMessage("Gmail connected successfully!")
    void fetch("/api/email-config", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.json())
      .then((data: { config?: EmailConfig | null; accounts?: EmailAccountRow[] }) => {
        setEmailConfig(data.config ?? null)
        setEmailAccounts(data.accounts ?? [])
      })
  }, [])

  const onOutlookConnected = useCallback(() => {
    setEmailMessage("Outlook connected successfully!")
    void fetch("/api/email-config", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.json())
      .then((data: { config?: EmailConfig | null; accounts?: EmailAccountRow[] }) => {
        setEmailConfig(data.config ?? null)
        setEmailAccounts(data.accounts ?? [])
      })
  }, [])

  const onOAuthError = useCallback((message: string) => {
    setEmailMessage(message)
  }, [])

  const handleSaveSmtp = async () => {
    setSmtpSaving(true)
    setEmailMessage("")
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_smtp",
          smtp_host: smtpForm.smtp_host,
          smtp_port: smtpForm.smtp_port,
          smtp_username: smtpForm.smtp_username,
          smtp_password: smtpForm.smtp_password,
          smtp_from_email: smtpForm.smtp_from_email,
          smtp_from_name: smtpForm.smtp_from_name,
          smtp_use_tls: smtpForm.smtp_use_tls,
          imap_host: smtpForm.imap_host,
          imap_port: smtpForm.imap_port,
          imap_username: smtpForm.imap_username || smtpForm.smtp_username,
          imap_password: smtpForm.imap_password || smtpForm.smtp_password,
          imap_use_tls: smtpForm.imap_use_tls,
          account_id: smtpForm.smtp_account_id || undefined,
        }),
      })
      if (res.ok) {
        setEmailMessage("SMTP settings saved successfully!")
        const configRes = await fetch("/api/email-config")
        const data = await configRes.json()
        setEmailConfig(data.config)
        const accounts = (data.accounts ?? []) as EmailAccountRow[]
        setEmailAccounts(accounts)
        const smtpList = accounts.filter((a) => a.provider === "smtp")
        const picked =
          smtpList.find((a) => a.id === smtpForm.smtp_account_id) ??
          smtpList.find((a) => a.is_default_for_send) ??
          smtpList[smtpList.length - 1]
        if (picked) {
          applySmtpAccountToForm(picked)
        } else {
          applySmtpAccountToForm("new")
        }
      } else {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        setEmailMessage(errData.error || "Failed to save SMTP settings.")
      }
    } catch {
      setEmailMessage("Failed to save SMTP settings.")
    }
    setSmtpSaving(false)
  }

  const handleDisconnect = async (accountId: string) => {
    try {
      await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", account_id: accountId }),
      })
      const configRes = await fetch("/api/email-config")
      const data = await configRes.json()
      setEmailConfig(data.config)
      const accounts = (data.accounts ?? []) as EmailAccountRow[]
      setEmailAccounts(accounts)
      const smtpList = accounts.filter((a) => a.provider === "smtp")
      const picked =
        smtpList.find((a) => a.is_default_for_send) ?? smtpList[0]
      if (picked) {
        applySmtpAccountToForm(picked)
      } else {
        applySmtpAccountToForm("new")
      }
      setEmailMessage("Account disconnected.")
    } catch {
      setEmailMessage("Failed to disconnect.")
    }
  }

  const handleSaveCaldav = async () => {
    if (!caldavForm.caldav_username.trim() || !caldavForm.caldav_password.trim()) {
      setEmailMessage("CalDAV username and password are required.")
      return
    }
    setCaldavSaving(true)
    setEmailMessage("")
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_caldav",
          display_name: caldavForm.display_name,
          caldav_url: caldavForm.caldav_url,
          caldav_username: caldavForm.caldav_username,
          caldav_password: caldavForm.caldav_password,
          source_id: caldavForm.source_id || undefined,
        }),
      })
      if (res.ok) {
        setEmailMessage("Calendar connection saved.")
        const configRes = await fetch("/api/email-config")
        const data = await configRes.json()
        setCalendarSources(data.calendarSources ?? [])
        const cal = (data.calendarSources ?? [])[0] as CalendarSourceRow | undefined
        if (cal) {
          setCaldavForm((f) => ({ ...f, source_id: cal.id }))
        }
      } else {
        setEmailMessage("Failed to save calendar connection.")
      }
    } catch {
      setEmailMessage("Failed to save calendar connection.")
    }
    setCaldavSaving(false)
  }

  const handleDeleteCaldav = async (id: string) => {
    try {
      await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_caldav", source_id: id }),
      })
      const configRes = await fetch("/api/email-config")
      const data = await configRes.json()
      setCalendarSources(data.calendarSources ?? [])
      setCaldavForm({
        display_name: "iCloud",
        caldav_url: "https://caldav.icloud.com",
        caldav_username: "",
        caldav_password: "",
        source_id: "",
      })
      setEmailMessage("Calendar connection removed.")
    } catch {
      setEmailMessage("Failed to remove calendar.")
    }
  }

  const handleSetDefault = async (accountId: string) => {
    try {
      await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default", account_id: accountId }),
      })
      const configRes = await fetch("/api/email-config")
      const data = await configRes.json()
      setEmailAccounts(data.accounts ?? [])
      setEmailConfig(data.config)
    } catch {
      setEmailMessage("Failed to set default account.")
    }
  }

  const handleSaveSignature = async () => {
    setSignatureSaving(true)
    setSignatureMessage("")
    try {
      localStorage.setItem("vo_email_signature", signature)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase.from("email_signatures").upsert(
          {
            user_id: user.id,
            signature_text: signature,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        if (error) throw error
      }

      setSignatureMessage("Signature saved successfully!")
      setTimeout(() => setSignatureMessage(""), 3000)
    } catch {
      setSignatureMessage("Failed to save signature. Please try again.")
    } finally {
      setSignatureSaving(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    const supabase = createClient()
    const formData = new FormData(e.currentTarget)
    const { error } = await supabase.from("profiles").update({
      first_name: (formData.get("first_name") as string) || null,
      last_name: (formData.get("last_name") as string) || null,
      business_name: (formData.get("business_name") as string) || null,
      experience_level: (formData.get("experience_level") as string) || null,
    }).eq("id", profile?.id)
    setSaving(false)
    if (error) {
      setMessage("Failed to save. Please try again.")
    } else {
      setMessage("Profile updated successfully.")
      const { data } = await supabase.from("profiles").select("*").eq("id", profile?.id).single()
      if (data) setProfile(data)
    }
  }

  const tierLabel = (() => {
    const base = profile?.subscription_tier
    if (!base) return "Free"
    const normalized = base.trim().toLowerCase()
    if (normalized === "command" || normalized.includes("command")) return "Command ($99/mo)"
    if (normalized === "momentum" || normalized.includes("momentum")) return "Momentum ($49/mo)"
    if (normalized === "launch" || normalized.includes("launch")) return "Launch ($29/mo)"
    return "Free"
  })()

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Suspense fallback={null}>
        <OAuthCallbackMessages
          onGmailConnected={onGmailConnected}
          onOutlookConnected={onOutlookConnected}
          onOAuthError={onOAuthError}
        />
      </Suspense>
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Profile and subscription first, then demo reels, email (Gmail, Microsoft 365, SMTP), calendar, and signature.
        </p>
      </div>

      <Card id="email-connect" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Unified inbox, multi-account: add several Gmail and Microsoft 365 mailboxes (recommended up to four) and view
            them together on Inbox—alongside SMTP/IMAP. OAuth for Google and Microsoft is at the top of this card; SMTP
            is below your connected accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {emailConfigLoading && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Loading your saved connections… Gmail and Microsoft buttons below stay visible; they unlock after this
              finishes.
            </div>
          )}
          <>
              {emailTableNotCreated && (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-5 text-amber-500" />
                    <p className="font-medium text-amber-500">Database setup required</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Run{" "}
                    <code className="rounded bg-muted px-1">
                      scripts/email-accounts-and-calendar-sources.sql
                    </code>{" "}
                    in the Supabase SQL Editor, then refresh this page. Gmail, Outlook, and SMTP
                    save are disabled until the <code className="rounded bg-muted px-1">email_accounts</code> table exists.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {emailAccounts.length > 0 ? "Add another mailbox" : "Connect your first mailbox"}
                </p>
                <Badge variant="outline" className="text-xs font-normal">
                  {emailAccounts.length} / {MAX_EMAIL_ACCOUNTS_PER_USER} mailboxes
                </Badge>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-[oklch(0.55_0.22_295_/_0.35)] bg-[oklch(0.55_0.22_295_/_0.08)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">Unified inbox (multi-account)</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Like Outlook on Windows: Gmail and Microsoft 365 use OAuth below; Yahoo and custom hosts use SMTP/IMAP
                    farther down. An active SMTP mailbox does not block adding Gmail or Microsoft—use both. Up to{" "}
                    {MAX_EMAIL_ACCOUNTS_PER_USER} mailboxes total.
                  </p>
                  </div>
                  <Button variant="secondary" size="sm" className="shrink-0 gap-1.5" asChild>
                    <Link href="/dashboard/inbox">
                      <Inbox className="size-4" />
                      Open Inbox
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Google Gmail &amp; Microsoft 365 (Outlook)</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This is your <span className="font-medium text-foreground">email mailbox</span> (Gmail and Outlook /
                    Office 365)—not Google Gemini AI. Add each account with one click. Reconnect if OAuth scopes were
                    upgraded.
                  </p>
                  {emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER && (
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      Mailbox limit reached. Disconnect an account below to connect Gmail or Microsoft 365.
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] gap-2 border-2 border-foreground/20 bg-background disabled:opacity-70"
                    disabled={
                      emailConfigLoading ||
                      emailTableNotCreated ||
                      emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER
                    }
                    title={
                      emailConfigLoading
                        ? "Wait for connections to finish loading"
                        : emailTableNotCreated
                          ? "Run the SQL migration in Supabase first"
                          : emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER
                            ? "Disconnect a mailbox to add another"
                            : undefined
                    }
                    onClick={() => {
                      if (
                        !emailConfigLoading &&
                        !emailTableNotCreated &&
                        emailAccounts.length < MAX_EMAIL_ACCOUNTS_PER_USER
                      ) {
                        window.location.href = "/api/auth/gmail"
                      }
                    }}
                  >
                    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {emailAccounts.length > 0 ? "Add Google Gmail" : "Connect Google Gmail"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] gap-2 border-2 border-foreground/20 bg-background disabled:opacity-70"
                    disabled={
                      emailConfigLoading ||
                      emailTableNotCreated ||
                      emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER
                    }
                    title={
                      emailConfigLoading
                        ? "Wait for connections to finish loading"
                        : emailTableNotCreated
                          ? "Run the SQL migration in Supabase first"
                          : emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER
                            ? "Disconnect a mailbox to add another"
                            : undefined
                    }
                    onClick={() => {
                      if (
                        !emailConfigLoading &&
                        !emailTableNotCreated &&
                        emailAccounts.length < MAX_EMAIL_ACCOUNTS_PER_USER
                      ) {
                        window.location.href = "/api/auth/outlook"
                      }
                    }}
                  >
                    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7.29-.3.7-.3h6.25V1.62q0-.46.33-.8.33-.32.8-.32h14.8q.46 0 .8.33.32.33.32.8V12zm-6 8.25V10.5H8.13v9.38z"
                      />
                    </svg>
                    {emailAccounts.length > 0 ? "Add Microsoft 365" : "Connect Microsoft 365 (Outlook)"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Server env: <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>,{" "}
                  <code className="rounded bg-muted px-1">MICROSOFT_CLIENT_ID</code>, and their secrets (required for
                  OAuth).
                </p>
              </div>


              {emailAccounts.length > 0 && (
                <div className="flex flex-col gap-4">
                  {emailAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-green-500/20">
                            <Check className="size-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {acc.provider === "gmail"
                                ? "Gmail"
                                : acc.provider === "outlook"
                                  ? "Outlook"
                                  : "SMTP"}
                              {acc.is_default_for_send && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Default send
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {acc.oauth_email || acc.smtp_from_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!acc.is_default_for_send && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSetDefault(acc.id)}
                            >
                              Set default
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleDisconnect(acc.id)}>
                            <Unlink className="mr-1.5 size-3.5" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`bcc-${acc.id}`}>BCC myself (this account)</Label>
                          <p className="text-sm text-muted-foreground">
                            Copy sent mail to your address when sending from this account.
                          </p>
                        </div>
                        <Switch
                          id={`bcc-${acc.id}`}
                          checked={acc.bcc_self === true}
                          onCheckedChange={async (checked) => {
                            try {
                              await fetch("/api/email-config", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "toggle_bcc",
                                  account_id: acc.id,
                                  bcc_self: checked,
                                }),
                              })
                              setEmailAccounts((prev) =>
                                prev.map((a) =>
                                  a.id === acc.id ? { ...a, bcc_self: checked } : a
                                )
                              )
                              setEmailMessage(
                                checked
                                  ? "BCC enabled for this account."
                                  : "BCC disabled for this account."
                              )
                            } catch {
                              setEmailMessage("Failed to update BCC setting.")
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}

              <Separator />

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">SMTP / IMAP (multiple mailboxes)</h3>
                  <p className="text-sm text-muted-foreground">
                    Add Yahoo, custom domains, or any host that gives you SMTP + IMAP credentials. Pick an existing SMTP
                    row in the dropdown to edit it, or choose{" "}
                    <span className="font-medium text-foreground">Add new SMTP…</span> and Save to create another mailbox.
                    Password fields can stay blank when updating—only fill them to set or change the stored password.
                  </p>
                </div>
                {smtpAccountsOnly.length > 0 && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-2 sm:max-w-md">
                      <Label htmlFor="smtp-edit-pick">SMTP account to edit</Label>
                      <Select
                        value={smtpForm.smtp_account_id || "__new__"}
                        onValueChange={(v) => {
                          if (v === "__new__") {
                            applySmtpAccountToForm("new")
                          } else {
                            const acc = smtpAccountsOnly.find((a) => a.id === v)
                            if (acc) applySmtpAccountToForm(acc)
                          }
                        }}
                      >
                        <SelectTrigger id="smtp-edit-pick" className="min-h-[44px]">
                          <SelectValue placeholder="Choose account" />
                        </SelectTrigger>
                        <SelectContent>
                          {smtpAccountsOnly.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.smtp_from_email || a.smtp_host || "SMTP account"}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__">+ Add new SMTP / Yahoo / IMAP mailbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px] shrink-0"
                      onClick={() => applySmtpAccountToForm("new")}
                    >
                      New SMTP mailbox form
                    </Button>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-smtp_host">SMTP Host</Label>
                      <Input
                        id="ia-smtp_host"
                        placeholder="smtp.gmail.com"
                        value={smtpForm.smtp_host}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_host: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-smtp_port">Port</Label>
                      <Input
                        id="ia-smtp_port"
                        placeholder="587"
                        value={smtpForm.smtp_port}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_port: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-smtp_username">Username</Label>
                      <Input
                        id="ia-smtp_username"
                        placeholder="your@email.com"
                        value={smtpForm.smtp_username}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_username: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-smtp_password">Password</Label>
                      <Input
                        id="ia-smtp_password"
                        type="password"
                        placeholder="App password"
                        value={smtpForm.smtp_password}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_password: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-smtp_from_email">From Email</Label>
                      <Input
                        id="ia-smtp_from_email"
                        placeholder="your@email.com"
                        value={smtpForm.smtp_from_email}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_from_email: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-smtp_from_name">From Name</Label>
                      <Input
                        id="ia-smtp_from_name"
                        placeholder="Your Name"
                        value={smtpForm.smtp_from_name}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_from_name: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="ia-smtp_use_tls"
                      checked={smtpForm.smtp_use_tls}
                      onCheckedChange={(checked) => setSmtpForm((f) => ({ ...f, smtp_use_tls: checked }))}
                    />
                    <Label htmlFor="ia-smtp_use_tls">Use TLS/STARTTLS (SMTP)</Label>
                  </div>
                  <Separator />
                  <p className="text-sm font-medium text-foreground">IMAP (unified inbox)</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-imap_host">IMAP Host</Label>
                      <Input
                        id="ia-imap_host"
                        placeholder="imap.gmail.com"
                        value={smtpForm.imap_host}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, imap_host: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-imap_port">IMAP Port</Label>
                      <Input
                        id="ia-imap_port"
                        placeholder="993"
                        value={smtpForm.imap_port}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, imap_port: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-imap_username">IMAP Username</Label>
                      <Input
                        id="ia-imap_username"
                        placeholder="Leave blank to use SMTP username"
                        value={smtpForm.imap_username}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, imap_username: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ia-imap_password">IMAP Password</Label>
                      <Input
                        id="ia-imap_password"
                        type="password"
                        placeholder="Leave blank to use SMTP password"
                        value={smtpForm.imap_password}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, imap_password: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="ia-imap_use_tls"
                      checked={smtpForm.imap_use_tls}
                      onCheckedChange={(checked) => setSmtpForm((f) => ({ ...f, imap_use_tls: checked }))}
                    />
                    <Label htmlFor="ia-imap_use_tls">IMAP TLS</Label>
                  </div>
                  {!smtpForm.smtp_account_id &&
                    emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER && (
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        Mailbox limit reached. Disconnect an account above to add another SMTP mailbox.
                      </p>
                    )}
                  <Button
                    onClick={handleSaveSmtp}
                    disabled={
                      smtpSaving ||
                      emailTableNotCreated ||
                      emailConfigLoading ||
                      (!smtpForm.smtp_account_id &&
                        emailAccounts.length >= MAX_EMAIL_ACCOUNTS_PER_USER)
                    }
                    size="lg"
                    className="min-h-[44px]"
                  >
                    {smtpSaving ? "Saving..." : "Save SMTP / IMAP"}
                  </Button>
              </div>

              {emailMessage && (
                <p
                  className={`text-sm ${
                    emailMessage.includes("success") ||
                    emailMessage.includes("Saved") ||
                    emailMessage.includes("connected") ||
                    emailMessage.includes("removed") ||
                    emailMessage.includes("enabled") ||
                    emailMessage.includes("disabled")
                      ? "text-green-500"
                      : "text-destructive"
                  }`}
                >
                  {emailMessage}
                </p>
              )}
          </>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal and business details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input value={email} disabled className="min-h-[44px] bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" name="first_name" defaultValue={profile?.first_name || ""} className="min-h-[44px]" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" name="last_name" defaultValue={profile?.last_name || ""} className="min-h-[44px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input id="business_name" name="business_name" defaultValue={profile?.business_name || ""} className="min-h-[44px]" placeholder="e.g. My VO Studio" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="experience_level">Experience Level</Label>
              <Select name="experience_level" defaultValue={profile?.experience_level || ""}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="scaling">Scaling / Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {message && <p className="text-sm text-violet-400">{message}</p>}
            <Button type="submit" size="lg" className="min-h-[44px]" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <DemoReelsSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your VO Biz Suite plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <Badge variant="secondary" className="bg-accent/20 text-accent-foreground font-semibold">
              {tierLabel}
            </Badge>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Upgrade or change your plan to unlock more features and grow your VO business.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" size="lg" className="min-h-[44px]">
              <Link href="/#pricing">View Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-4" />
            Calendar (iCloud / CalDAV)
          </CardTitle>
          <CardDescription>
            Show Apple Calendar alongside Google and Microsoft on the Calendar page. Use an app-specific password from
            your Apple ID account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {calendarSources.length > 0 && (
            <ul className="flex flex-col gap-2">
              {calendarSources.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {s.display_name || "CalDAV"} — {s.caldav_username}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCaldav(s.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="caldav_name">Label</Label>
              <Input
                id="caldav_name"
                value={caldavForm.display_name}
                onChange={(e) =>
                  setCaldavForm((f) => ({ ...f, display_name: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="caldav_url">CalDAV URL</Label>
              <Input
                id="caldav_url"
                value={caldavForm.caldav_url}
                onChange={(e) =>
                  setCaldavForm((f) => ({ ...f, caldav_url: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="caldav_user">Apple ID (email)</Label>
              <Input
                id="caldav_user"
                value={caldavForm.caldav_username}
                onChange={(e) =>
                  setCaldavForm((f) => ({ ...f, caldav_username: e.target.value }))
                }
                autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="caldav_pass">App-specific password</Label>
              <Input
                id="caldav_pass"
                type="password"
                value={caldavForm.caldav_password}
                onChange={(e) =>
                  setCaldavForm((f) => ({ ...f, caldav_password: e.target.value }))
                }
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSaveCaldav}
            disabled={caldavSaving}
            size="lg"
            className="min-h-[44px] w-fit"
          >
            {caldavSaving ? "Saving…" : "Save calendar connection"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="size-4" />
            Email Signature
          </CardTitle>
          <CardDescription>Create a signature to automatically append to your outreach emails.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {signatureLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Best regards,&#10;Your Name&#10;Voice Over Artist&#10;yourwebsite.com | (555) 123-4567"
                rows={6}
                className="text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Your signature will be automatically appended to generated emails.
                </p>
                <Button 
                  size="sm" 
                  onClick={handleSaveSignature} 
                  disabled={signatureSaving}
                  className="gap-1.5"
                >
                  {signatureSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : signatureMessage ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {signatureSaving ? "Saving..." : signatureMessage ? "Saved!" : "Save Signature"}
                </Button>
              </div>
              {signatureMessage && (
                <p className="text-sm text-green-500">{signatureMessage}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            To change your password or update your email, use the options below.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="min-h-[44px]"
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.resetPasswordForEmail(email)
              setMessage("Password reset email sent. Check your inbox.")
            }}
          >
            Send Password Reset Email
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
