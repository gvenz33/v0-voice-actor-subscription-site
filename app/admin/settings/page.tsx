"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Database, Mail, Shield, Save } from "lucide-react"

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Settings would be saved to database
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system-wide settings</p>
      </div>

      <div className="grid gap-6">
        {/* System Settings */}
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
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
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@vobizsuite.com"
              />
              <p className="text-sm text-muted-foreground">
                Email address for admin notifications
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
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

        {/* Danger Zone */}
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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
