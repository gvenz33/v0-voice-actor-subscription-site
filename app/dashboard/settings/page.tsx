"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { User, CreditCard, Shield, Mail, Check, AlertCircle, Loader2, Unlink, FileSignature, Save } from "lucide-react"
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

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  
  // Email config state
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)
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
  })
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [emailMessage, setEmailMessage] = useState("")
  
  // Signature state
  const [signature, setSignature] = useState("")
  const [signatureLoading, setSignatureLoading] = useState(true)
  const [signatureSaving, setSignatureSaving] = useState(false)
  const [signatureMessage, setSignatureMessage] = useState("")

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
        const res = await fetch("/api/email-config")
        const data = await res.json()
        setEmailConfig(data.config)
        if (data.tableNotCreated) {
          setEmailTableNotCreated(true)
        }
      } catch {
        console.error("Failed to load email config")
      }
      setEmailConfigLoading(false)
    }
    loadEmailConfig()
  }, [])

  // Load signature
  useEffect(() => {
    async function loadSignature() {
      try {
        const res = await fetch("/api/signature")
        const data = await res.json()
        if (data.signature) setSignature(data.signature)
      } catch {
        // Fallback to localStorage
        const saved = localStorage.getItem("vo_email_signature")
        if (saved) setSignature(saved)
      }
      setSignatureLoading(false)
    }
    loadSignature()
  }, [])

  // Handle OAuth success/error messages
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success === "gmail_connected") {
      setEmailMessage("Gmail connected successfully!")
      // Reload email config
      fetch("/api/email-config").then(res => res.json()).then(data => setEmailConfig(data.config))
    } else if (success === "outlook_connected") {
      setEmailMessage("Outlook connected successfully!")
      fetch("/api/email-config").then(res => res.json()).then(data => setEmailConfig(data.config))
    } else if (error) {
      setEmailMessage(`Connection failed: ${error.replace(/_/g, " ")}`)
    }
  }, [searchParams])

  const handleSaveSmtp = async () => {
    setSmtpSaving(true)
    setEmailMessage("")
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_smtp", ...smtpForm }),
      })
      if (res.ok) {
        setEmailMessage("SMTP settings saved successfully!")
        const configRes = await fetch("/api/email-config")
        const data = await configRes.json()
        setEmailConfig(data.config)
      } else {
        setEmailMessage("Failed to save SMTP settings.")
      }
    } catch {
      setEmailMessage("Failed to save SMTP settings.")
    }
    setSmtpSaving(false)
  }

  const handleDisconnect = async () => {
    try {
      await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      setEmailConfig(null)
      setEmailMessage("Email account disconnected.")
    } catch {
      setEmailMessage("Failed to disconnect.")
    }
  }

  const handleSaveSignature = async () => {
    setSignatureSaving(true)
    setSignatureMessage("")
    try {
      await fetch("/api/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      })
      localStorage.setItem("vo_email_signature", signature)
      setSignatureMessage("Signature saved successfully!")
      setTimeout(() => setSignatureMessage(""), 3000)
    } catch {
      localStorage.setItem("vo_email_signature", signature)
      setSignatureMessage("Saved locally.")
      setTimeout(() => setSignatureMessage(""), 3000)
    }
    setSignatureSaving(false)
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

  const tierLabel =
    profile?.subscription_tier === "command"
      ? "Command ($99/mo)"
      : profile?.subscription_tier === "momentum"
        ? "Momentum ($49/mo)"
        : profile?.subscription_tier === "launch"
          ? "Launch ($19/mo)"
          : "Free"

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your account, profile, and subscription.
        </p>
      </div>

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
            <Mail className="size-4" />
            Email Configuration
          </CardTitle>
          <CardDescription>Connect your email account to send outreach emails directly from the platform.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {emailConfigLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : emailTableNotCreated ? (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 text-amber-500" />
                <p className="font-medium text-amber-500">Database Setup Required</p>
              </div>
              <p className="text-sm text-muted-foreground">
                The email configuration table needs to be created in your Supabase database. Please run the following SQL in your Supabase SQL Editor:
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
{`create table if not exists public.email_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  provider text,
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamptz,
  oauth_email text,
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_use_tls boolean default true,
  bcc_self boolean default false,
  signature_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.email_config enable row level security;

create policy "email_config_select_own" on public.email_config 
  for select using (auth.uid() = user_id);
create policy "email_config_insert_own" on public.email_config 
  for insert with check (auth.uid() = user_id);
create policy "email_config_update_own" on public.email_config 
  for update using (auth.uid() = user_id);
create policy "email_config_delete_own" on public.email_config 
  for delete using (auth.uid() = user_id);`}
              </pre>
              <p className="text-sm text-muted-foreground">
                After running the migration, refresh this page. In the meantime, you can still use the "Open in Mail App" option.
              </p>
            </div>
          ) : emailConfig?.provider ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="size-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {emailConfig.provider === "gmail" ? "Gmail" : emailConfig.provider === "outlook" ? "Outlook" : "SMTP"} Connected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {emailConfig.oauth_email || emailConfig.smtp_from_email}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Unlink className="mr-1.5 size-3.5" />
                  Disconnect
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="bcc-self">BCC myself on all outgoing emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a copy of every email you send for your records.
                  </p>
                </div>
                <Switch
                  id="bcc-self"
                  checked={emailConfig.bcc_self === true}
                  onCheckedChange={async (checked) => {
                    try {
                      await fetch("/api/email-config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "toggle_bcc", bcc_self: checked }),
                      })
                      setEmailConfig({ ...emailConfig, bcc_self: checked })
                      setEmailMessage(checked ? "BCC enabled - you'll receive copies of sent emails." : "BCC disabled.")
                    } catch {
                      setEmailMessage("Failed to update BCC setting.")
                    }
                  }}
                />
              </div>
              
              {emailMessage && (
                <p className="text-sm text-green-500">{emailMessage}</p>
              )}
            </div>
          ) : (
            <Tabs defaultValue="oauth" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth">Gmail / Outlook</TabsTrigger>
                <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="oauth" className="mt-4 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Gmail or Outlook account to send emails directly from your personal email address.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] gap-2"
                    onClick={() => window.location.href = "/api/auth/gmail"}
                  >
                    <svg className="size-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Connect Gmail
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] gap-2"
                    onClick={() => window.location.href = "/api/auth/outlook"}
                  >
                    <svg className="size-4" viewBox="0 0 24 24"><path fill="currentColor" d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7.29-.3.7-.3h6.25V1.62q0-.46.33-.8.33-.32.8-.32h14.8q.46 0 .8.33.32.33.32.8V12zm-6 8.25V10.5H8.13v9.38z"/></svg>
                    Connect Outlook
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Gmail/Outlook OAuth requires setting up GOOGLE_CLIENT_ID/MICROSOFT_CLIENT_ID environment variables.
                </p>
              </TabsContent>
              
              <TabsContent value="smtp" className="mt-4 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Configure custom SMTP settings if you prefer to use your own mail server.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      placeholder="smtp.gmail.com"
                      value={smtpForm.smtp_host}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_host: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtp_port">Port</Label>
                    <Input
                      id="smtp_port"
                      placeholder="587"
                      value={smtpForm.smtp_port}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_port: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtp_username">Username</Label>
                    <Input
                      id="smtp_username"
                      placeholder="your@email.com"
                      value={smtpForm.smtp_username}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_username: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtp_password">Password</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      placeholder="App password"
                      value={smtpForm.smtp_password}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_password: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtp_from_email">From Email</Label>
                    <Input
                      id="smtp_from_email"
                      placeholder="your@email.com"
                      value={smtpForm.smtp_from_email}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_from_email: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtp_from_name">From Name</Label>
                    <Input
                      id="smtp_from_name"
                      placeholder="Your Name"
                      value={smtpForm.smtp_from_name}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_from_name: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="smtp_use_tls"
                    checked={smtpForm.smtp_use_tls}
                    onCheckedChange={checked => setSmtpForm(f => ({ ...f, smtp_use_tls: checked }))}
                  />
                  <Label htmlFor="smtp_use_tls">Use TLS/STARTTLS</Label>
                </div>
                <Button onClick={handleSaveSmtp} disabled={smtpSaving} size="lg" className="min-h-[44px]">
                  {smtpSaving ? "Saving..." : "Save SMTP Settings"}
                </Button>
              </TabsContent>
              
              {emailMessage && (
                <p className={`text-sm ${emailMessage.includes("success") ? "text-green-500" : "text-destructive"}`}>
                  {emailMessage}
                </p>
              )}
            </Tabs>
          )}
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
