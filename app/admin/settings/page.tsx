"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Database, Mail, MessageCircle, Shield, Save } from "lucide-react"

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [supportChatEnabled, setSupportChatEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings")
        const data = (await res.json()) as {
          error?: string
          supportChatEnabled?: boolean
        }

        if (!res.ok) {
          throw new Error(data.error || "Failed to load settings")
        }

        if (!cancelled && typeof data.supportChatEnabled === "boolean") {
          setSupportChatEnabled(data.supportChatEnabled)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportChatEnabled }),
      })

      const data = (await res.json()) as {
        error?: string
        supportChatEnabled?: boolean
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings")
      }

      if (typeof data.supportChatEnabled === "boolean") {
        setSupportChatEnabled(data.supportChatEnabled)
      }

      setMessage("Settings saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system-wide settings</p>
      </div>

      {(message || error) && (
        <div
          className={
            error
              ? "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              : "rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400"
          }
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Support Chat
            </CardTitle>
            <CardDescription>
              Control the AI support chat widget shown on the public site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="supportChatEnabled">Support Chat Widget</Label>
                <p className="text-sm text-muted-foreground">
                  Show the floating chat assistant on all public pages
                </p>
              </div>
              <Switch
                id="supportChatEnabled"
                checked={supportChatEnabled}
                onCheckedChange={setSupportChatEnabled}
                disabled={loading || saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Control core system functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable access for all non-admin users
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
                disabled
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to create accounts
                </p>
              </div>
              <Switch
                checked={registrationEnabled}
                onCheckedChange={setRegistrationEnabled}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure admin email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New User Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email when new users sign up
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                disabled
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@vobizsuite.com"
                disabled
              />
              <p className="text-sm text-muted-foreground">
                Email address for admin notifications
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Information
            </CardTitle>
            <CardDescription>
              Connection and storage details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <span className="text-sm font-medium">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-green-500">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Region</span>
                <span className="text-sm font-medium">US East</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions - proceed with caution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <div className="font-medium">Clear All User Data</div>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all user data except admin accounts
                </p>
              </div>
              <Button variant="destructive" disabled>
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
