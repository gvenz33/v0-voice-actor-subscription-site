"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, CheckCircle2, Clock, Lock, MessageSquareHeart } from "lucide-react"
import type { BetaEnrollment, BetaFeedbackSubmission, MonthStatus } from "@/lib/beta-feedback-shared"
import { currentBetaMonth, monthStatuses } from "@/lib/beta-feedback-shared"

function StatusBadge({ status }: { status: MonthStatus }) {
  if (status === "complete") {
    return (
      <Badge className="border-artist-green/30 bg-artist-green/20 text-artist-green" variant="outline">
        <CheckCircle2 className="mr-1 size-3" />
        Complete
      </Badge>
    )
  }
  if (status === "locked") {
    return (
      <Badge className="bg-muted text-muted-foreground" variant="outline">
        <Lock className="mr-1 size-3" />
        Locked
      </Badge>
    )
  }
  return (
    <Badge className="border-artist-orange/30 bg-artist-orange/20 text-artist-orange" variant="outline">
      <Clock className="mr-1 size-3" />
      Pending
    </Badge>
  )
}

export function BetaFeedbackClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [enrollment, setEnrollment] = useState<BetaEnrollment | null>(null)
  const [submissions, setSubmissions] = useState<BetaFeedbackSubmission[]>([])
  const [monthNumber, setMonthNumber] = useState<1 | 2 | 3>(1)
  const [featureUsedMost, setFeatureUsedMost] = useState("")
  const [confusingOrDifficult, setConfusingOrDifficult] = useState("")
  const [moreUseful, setMoreUseful] = useState("")
  const [savedTimeOrOrganized, setSavedTimeOrOrganized] = useState("")
  const [wouldRecommend, setWouldRecommend] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/beta-feedback")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setEnrollment(data.enrollment)
      setSubmissions(data.submissions ?? [])
      if (data.enrollment) {
        const current = currentBetaMonth(data.enrollment.started_at)
        const statuses = monthStatuses(data.enrollment, data.submissions ?? [])
        const openMonth = ([1, 2, 3] as const).find((m) => statuses[m] === "pending") ?? current
        setMonthNumber(openMonth)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const statuses = useMemo(() => {
    if (!enrollment) return null
    return monthStatuses(enrollment, submissions)
  }, [enrollment, submissions])

  const submit = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthNumber,
          featureUsedMost,
          confusingOrDifficult,
          moreUseful,
          savedTimeOrOrganized,
          wouldRecommend,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit")
      setEnrollment(data.enrollment)
      setSubmissions(data.submissions ?? [])
      setMessage(`Month ${monthNumber} feedback submitted. Thank you for your active beta participation.`)
      setFeatureUsedMost("")
      setConfusingOrDifficult("")
      setMoreUseful("")
      setSavedTimeOrOrganized("")
      setWouldRecommend(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading BVS Beta Feedback…
      </div>
    )
  }

  if (!enrollment) {
    return (
      <Card className="artist-card-violet max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareHeart className="size-4 text-artist-violet" />
            BVS Beta Feedback
          </CardTitle>
          <CardDescription>
            This area is for BlumVox students enrolled with promo code BLUMVOX. After you subscribe with that code,
            your 3-month feedback progress will appear here.
          </CardDescription>
        </CardHeader>
        {error ? <CardContent className="text-sm text-destructive">{error}</CardContent> : null}
      </Card>
    )
  }

  const formOpen = statuses?.[monthNumber] === "pending"

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          BVS Beta Feedback
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active beta participation means completing one short monthly feedback form with thoughtful, usable responses
          during your first three months. After that, students who participated keep the discounted rate month-to-month;
          others can continue at the regular monthly price.
        </p>
      </div>

      <Card className="artist-card-green">
        <CardHeader>
          <CardTitle>BVS Beta Feedback Progress</CardTitle>
          <CardDescription>
            Status:{" "}
            <span className="font-medium text-foreground">
              {enrollment.status === "retained_discount"
                ? "Discount retained (active participation complete)"
                : enrollment.status === "regular_rate"
                  ? "Regular monthly rate"
                  : "Active beta (months 1–3)"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {([1, 2, 3] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={statuses?.[m] === "locked"}
              onClick={() => setMonthNumber(m)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                monthNumber === m ? "border-artist-green bg-artist-green/10" : "border-border"
              }`}
            >
              <div className="mb-2 text-sm font-semibold text-foreground">Month {m}</div>
              <StatusBadge status={statuses?.[m] ?? "pending"} />
            </button>
          ))}
        </CardContent>
      </Card>

      {wouldRecommend && (
        <Card className="artist-card-amber">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Glad you&apos;d recommend VO Biz Suite. We have a referral program where you can earn by referring fellow
            voice actors — open the{" "}
            <Link href="/dashboard/affiliate" className="font-medium text-artist-amber underline-offset-2 hover:underline">
              Affiliate
            </Link>{" "}
            tab in the left navigation and create your unique affiliate URL.
          </CardContent>
        </Card>
      )}

      {formOpen ? (
        <Card className="artist-card-violet">
          <CardHeader>
            <CardTitle>Month {monthNumber} feedback</CardTitle>
            <CardDescription>A few brief questions — please write a short, usable answer for each.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="feature">1. What feature did you use most?</Label>
              <Textarea id="feature" value={featureUsedMost} onChange={(e) => setFeatureUsedMost(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confusing">2. What was confusing or difficult?</Label>
              <Textarea
                id="confusing"
                value={confusingOrDifficult}
                onChange={(e) => setConfusingOrDifficult(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="useful">3. What would make the platform more useful?</Label>
              <Textarea id="useful" value={moreUseful} onChange={(e) => setMoreUseful(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saved">4. Did anything save you time or help you stay more organized?</Label>
              <Textarea
                id="saved"
                value={savedTimeOrOrganized}
                onChange={(e) => setSavedTimeOrOrganized(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
              <Label htmlFor="recommend" className="text-sm">
                5. Would you recommend it to another voice actor?
              </Label>
              <Switch id="recommend" checked={wouldRecommend} onCheckedChange={setWouldRecommend} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-artist-green">{message}</p>}
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Submit Month {monthNumber} feedback
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {statuses?.[monthNumber] === "complete"
              ? `Month ${monthNumber} is complete. Select another pending month above when available.`
              : `Month ${monthNumber} unlocks as your beta period progresses.`}
            {message ? <p className="mt-2 text-artist-green">{message}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
