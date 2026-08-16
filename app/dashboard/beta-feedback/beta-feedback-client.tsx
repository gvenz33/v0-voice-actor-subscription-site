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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, CheckCircle2, Clock, Lock, MessageSquareHeart, ImagePlus, X } from "lucide-react"
import type { BetaEnrollment, BetaFeedbackSubmission, MonthStatus } from "@/lib/beta-feedback-shared"
import { currentBetaMonth, monthStatuses } from "@/lib/beta-feedback-shared"
import type { BetaFeedbackProgram } from "@/lib/promo-codes"
import { BLUMVOX_PROMO_CODE } from "@/lib/promo-codes"
import { createClient } from "@/lib/supabase/client"
import {
  BETA_FEEDBACK_ACCEPT,
  BETA_FEEDBACK_BUCKET,
  MAX_BETA_FEEDBACK_SCREENSHOTS,
  buildBetaFeedbackStoragePath,
  formatBetaFeedbackFileSize,
  isAllowedBetaFeedbackScreenshot,
  type BetaFeedbackAttachment,
} from "@/lib/beta-feedback-media"

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

function programCopy(program: BetaFeedbackProgram) {
  if (program === BLUMVOX_PROMO_CODE) {
    return {
      title: "BVS Beta Feedback",
      progressTitle: "BVS Beta Feedback Progress",
      loading: "Loading BVS Beta Feedback…",
      empty:
        "This area is for BlumVox / BVS beta participants. After an admin enables you (or you subscribe with promo code BLUMVOX), your monthly feedback progress will appear here.",
      description:
        "Your BlumVox promo starts as a 3-month prepay when enrolled via promo. Share thoughtful, usable feedback in Months 1, 2, and 3 — you can attach screenshots and submit more than once per month. Finish all three months to keep the discounted rate month-to-month afterward when on the promo plan.",
      programLabel: "BVS Beta",
    }
  }

  return {
    title: "Beta Feedback",
    progressTitle: "Beta Feedback Progress",
    loading: "Loading Beta Feedback…",
    empty:
      "This area is for VO Biz Suite beta participants. After an admin enables you (or you subscribe with promo code BETA), your Month 1–3 feedback progress will appear here.",
    description:
      "Active beta participation means sharing thoughtful, usable feedback for Month 1, Month 2, and Month 3. You can attach screenshots and submit more than once per month. After 12 months (promo plan), beta users who participated can keep the discounted rate; others continue at the regular rate.",
    programLabel: "VO Biz Suite Beta",
  }
}

export function BetaFeedbackClient({ program }: { program: BetaFeedbackProgram }) {
  const copy = programCopy(program)
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
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/beta-feedback?program=${program}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program])

  const statuses = useMemo(() => {
    if (!enrollment) return null
    return monthStatuses(enrollment, submissions)
  }, [enrollment, submissions])

  const submit = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const attachments: BetaFeedbackAttachment[] = []
      if (screenshotFiles.length > 0) {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated.")

        for (const file of screenshotFiles.slice(0, MAX_BETA_FEEDBACK_SCREENSHOTS)) {
          if (!isAllowedBetaFeedbackScreenshot(file)) {
            throw new Error(
              `Invalid screenshot "${file.name}". Use PNG/JPG/WebP/GIF up to ${formatBetaFeedbackFileSize(
                10 * 1024 * 1024
              )}.`
            )
          }
          const path = buildBetaFeedbackStoragePath(user.id, file.name)
          const { error: uploadError } = await supabase.storage
            .from(BETA_FEEDBACK_BUCKET)
            .upload(path, file, {
              contentType: file.type || "image/png",
              upsert: false,
            })
          if (uploadError) throw new Error(uploadError.message)
          attachments.push({
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || "image/png",
            file_size: file.size,
          })
        }
      }

      const res = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program,
          monthNumber,
          featureUsedMost,
          confusingOrDifficult,
          moreUseful,
          savedTimeOrOrganized,
          wouldRecommend,
          attachments,
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
      setScreenshotFiles([])
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
        {copy.loading}
      </div>
    )
  }

  if (!enrollment) {
    return (
      <Card className="artist-card-violet max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareHeart className="size-4 text-artist-violet" />
            {copy.title}
          </CardTitle>
          <CardDescription>{copy.empty}</CardDescription>
        </CardHeader>
        {error ? <CardContent className="text-sm text-destructive">{error}</CardContent> : null}
      </Card>
    )
  }

  const formOpen = statuses?.[monthNumber] !== "locked"
  const monthSubmissions = submissions.filter((s) => s.month_number === monthNumber)
  const programTitle = enrollment.program_label || copy.programLabel

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          {copy.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <Card className="artist-card-green">
        <CardHeader>
          <CardTitle>{copy.progressTitle}</CardTitle>
          <CardDescription>
            {programTitle} · Status:{" "}
            <span className="font-medium text-foreground">
              {enrollment.status === "retained_discount"
                ? program === BLUMVOX_PROMO_CODE
                  ? "Discount retained — continues month-to-month after your 3-month prepay"
                  : "Discount retained (active participation complete)"
                : enrollment.status === "regular_rate"
                  ? "Regular rate"
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
            <CardDescription>
              A few brief questions — please write a short, usable answer for each. You can submit additional
              feedback for this month anytime it is unlocked.
            </CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="screenshots" className="flex items-center gap-2">
                <ImagePlus className="size-4" />
                Screenshots (optional, up to {MAX_BETA_FEEDBACK_SCREENSHOTS})
              </Label>
              <Input
                id="screenshots"
                type="file"
                accept={BETA_FEEDBACK_ACCEPT}
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  setScreenshotFiles((prev) =>
                    [...prev, ...picked].slice(0, MAX_BETA_FEEDBACK_SCREENSHOTS)
                  )
                  e.target.value = ""
                }}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP, or GIF — max 10 MB each. Attach UI issues or examples that help explain your feedback.
              </p>
              {screenshotFiles.length > 0 && (
                <ul className="space-y-1">
                  {screenshotFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                    >
                      <span className="truncate">
                        {file.name}{" "}
                        <span className="text-muted-foreground">
                          ({formatBetaFeedbackFileSize(file.size)})
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() =>
                          setScreenshotFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-artist-green">{message}</p>}
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {monthSubmissions.length > 0
                ? `Submit additional Month ${monthNumber} feedback`
                : `Submit Month ${monthNumber} feedback`}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Month {monthNumber} unlocks as your beta period progresses.
            {message ? <p className="mt-2 text-artist-green">{message}</p> : null}
          </CardContent>
        </Card>
      )}

      {monthSubmissions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Previous Month {monthNumber} submissions</CardTitle>
            <CardDescription>
              {monthSubmissions.length} submission{monthSubmissions.length === 1 ? "" : "s"} so far for this month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthSubmissions.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="mb-2 text-xs text-muted-foreground">
                  {new Date(sub.created_at).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Used most:</span> {sub.feature_used_most}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Confusing:</span> {sub.confusing_or_difficult}
                </p>
                <p className="mt-1">
                  <span className="font-medium">More useful:</span> {sub.more_useful}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Time / organization:</span> {sub.saved_time_or_organized}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Would recommend:</span> {sub.would_recommend ? "Yes" : "No"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
