"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Loader2, MessageSquareHeart } from "lucide-react"
import type { BetaEnrollment, BetaFeedbackSubmission, BetaEnrollmentStatus } from "@/lib/beta-feedback-shared"
import { monthStatuses } from "@/lib/beta-feedback-shared"
import type { BetaFeedbackProgram } from "@/lib/promo-codes"
import { BLUMVOX_PROMO_CODE } from "@/lib/promo-codes"

type ProfileRow = {
  id: string
  first_name?: string | null
  last_name?: string | null
  business_name?: string | null
  subscription_tier?: string | null
}

function programCopy(program: BetaFeedbackProgram) {
  if (program === BLUMVOX_PROMO_CODE) {
    return {
      title: "BVS Beta Feedback",
      progressTitle: "BVS Beta Feedback Progress",
      description:
        "Track BlumVox student active beta participation (Months 1–3) and review feedback. Export to Excel/CSV anytime.",
      empty: "No BlumVox beta enrollments yet.",
      participantLabel: "Student",
      detailLabel: "student",
      exportHref: "/api/admin/beta-feedback?program=BLUMVOX&export=csv",
      apiHref: "/api/admin/beta-feedback?program=BLUMVOX",
    }
  }

  return {
    title: "Beta Feedback",
    progressTitle: "Beta users Feedback Progress",
    description:
      "Track VO Biz Suite beta users active participation (Months 1–3) for promo code BETA. Review feedback and export to Excel/CSV anytime.",
    empty: "No BETA enrollments yet.",
    participantLabel: "Participant",
    detailLabel: "participant",
    exportHref: "/api/admin/beta-feedback?program=BETA&export=csv",
    apiHref: "/api/admin/beta-feedback?program=BETA",
  }
}

export function AdminBetaFeedbackClient({ program }: { program: BetaFeedbackProgram }) {
  const copy = programCopy(program)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [enrollments, setEnrollments] = useState<BetaEnrollment[]>([])
  const [submissions, setSubmissions] = useState<BetaFeedbackSubmission[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({})
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(copy.apiHref)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setEnrollments(data.enrollments ?? [])
      setSubmissions(data.submissions ?? [])
      setProfiles(data.profiles ?? {})
      if (!selectedEnrollmentId && data.enrollments?.[0]?.id) {
        setSelectedEnrollmentId(data.enrollments[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [copy.apiHref, selectedEnrollmentId])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program])

  const updateStatus = async (enrollmentId: string, status: BetaEnrollmentStatus) => {
    const res = await fetch("/api/admin/beta-feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, status }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to update status")
      return
    }
    await load()
  }

  const selectedSubs = submissions.filter((s) => s.enrollment_id === selectedEnrollmentId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            {copy.title}
          </h1>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <Button variant="outline" asChild>
          <a href={copy.exportHref}>
            <Download className="mr-2 size-4" />
            Export Excel/CSV
          </a>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="artist-card-green">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareHeart className="size-4 text-artist-green" />
            {copy.progressTitle}
          </CardTitle>
          <CardDescription>
            {enrollments.length} enrolled · {submissions.length} feedback submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.participantLabel}</TableHead>
                    <TableHead>Month 1</TableHead>
                    <TableHead>Month 2</TableHead>
                    <TableHead>Month 3</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => {
                    const profile = profiles[enrollment.user_id]
                    const name =
                      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
                      profile?.business_name ||
                      enrollment.user_id.slice(0, 8)
                    const statuses = monthStatuses(
                      enrollment,
                      submissions.filter((s) => s.enrollment_id === enrollment.id)
                    )
                    return (
                      <TableRow
                        key={enrollment.id}
                        className={selectedEnrollmentId === enrollment.id ? "bg-muted/40" : undefined}
                      >
                        <TableCell>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">{profile?.subscription_tier}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {statuses[1]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {statuses[2]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {statuses[3]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={enrollment.status}
                            onValueChange={(v) => void updateStatus(enrollment.id, v as BetaEnrollmentStatus)}
                          >
                            <SelectTrigger className="h-8 w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active_beta">Active beta</SelectItem>
                              <SelectItem value="retained_discount">Retained discount</SelectItem>
                              <SelectItem value="regular_rate">Regular rate</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedEnrollmentId(enrollment.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="artist-card-violet">
        <CardHeader>
          <CardTitle>Feedback detail</CardTitle>
          <CardDescription>
            {selectedEnrollmentId
              ? `Showing ${selectedSubs.length} submission(s) for selected ${copy.detailLabel}`
              : `Select a ${copy.detailLabel} to read their feedback`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No feedback submitted yet for this {copy.detailLabel}.
            </p>
          ) : (
            selectedSubs.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-border p-4 text-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge>Month {sub.month_number}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(sub.created_at).toLocaleString()}
                  </span>
                </div>
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
                  <span className="font-medium">Would recommend:</span>{" "}
                  {sub.would_recommend ? "Yes" : "No"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
