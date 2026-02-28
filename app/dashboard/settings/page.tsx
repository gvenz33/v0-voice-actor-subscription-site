"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, CreditCard, Shield } from "lucide-react"
import Link from "next/link"

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_tier: string
  experience_level: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

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
            {message && <p className="text-sm text-emerald-600">{message}</p>}
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
