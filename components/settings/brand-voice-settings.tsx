"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles } from "lucide-react"

const MAX_BRAND_VOICE_CHARS = 4000

function isMissingBrandVoiceColumn(message: string): boolean {
  return message.includes("brand_voice") && message.includes("does not exist")
}

export function BrandVoiceSettings() {
  const [brandVoice, setBrandVoice] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [needsMigration, setNeedsMigration] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("brand_voice")
      .eq("id", user.id)
      .maybeSingle()

    if (fetchError) {
      if (isMissingBrandVoiceColumn(fetchError.message)) {
        setNeedsMigration(true)
      } else {
        setError(fetchError.message)
      }
    } else {
      setBrandVoice(data?.brand_voice ?? "")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    setError("")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be signed in.")
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        brand_voice: brandVoice.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    setSaving(false)
    if (updateError) {
      if (isMissingBrandVoiceColumn(updateError.message)) {
        setNeedsMigration(true)
      } else {
        setError(updateError.message)
      }
    } else {
      setMessage("Brand voice saved. AI Tools will use this tone in emails and messages.")
      setTimeout(() => setMessage(""), 4000)
    }
  }

  return (
    <Card id="brand-voice">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Brand voice
        </CardTitle>
        <CardDescription>
          Describe how you sound in emails and outreach. AI Tools (outreach emails, follow-ups,
          pitches) will match this style.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsMigration && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Run <code className="rounded bg-muted px-1">scripts/ensure-media-repository.sql</code>{" "}
            in Supabase SQL Editor to enable brand voice.
          </p>
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="brand-voice">Your brand voice guide</Label>
              <Textarea
                id="brand-voice"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value.slice(0, MAX_BRAND_VOICE_CHARS))}
                placeholder="Example: Warm, confident, and conversational—never salesy. Short sentences. I sign off with 'Best' and use humor sparingly. Avoid corporate jargon like 'synergy' or 'circle back'."
                rows={6}
                disabled={needsMigration}
              />
              <p className="text-xs text-muted-foreground text-right">
                {brandVoice.length} / {MAX_BRAND_VOICE_CHARS}
              </p>
            </div>
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button onClick={handleSave} disabled={saving || needsMigration}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save brand voice"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
