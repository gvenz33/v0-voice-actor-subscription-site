export type BetaEnrollmentStatus = "active_beta" | "retained_discount" | "regular_rate"

export type MonthStatus = "complete" | "pending" | "locked"

export interface BetaEnrollment {
  id: string
  user_id: string
  promo_code: string
  program_label: string
  started_at: string
  ends_at: string
  status: BetaEnrollmentStatus
}

export interface BetaFeedbackSubmission {
  id: string
  enrollment_id: string
  user_id: string
  month_number: 1 | 2 | 3
  feature_used_most: string
  confusing_or_difficult: string
  more_useful: string
  saved_time_or_organized: string
  would_recommend: boolean
  referral_note: string | null
  created_at: string
}

export interface BetaFeedbackInput {
  monthNumber: 1 | 2 | 3
  featureUsedMost: string
  confusingOrDifficult: string
  moreUseful: string
  savedTimeOrOrganized: string
  wouldRecommend: boolean
  referralNote?: string
}

export function currentBetaMonth(startedAt: string, now = new Date()): 1 | 2 | 3 {
  const start = new Date(startedAt)
  const ms = now.getTime() - start.getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 30) return 1
  if (days < 60) return 2
  return 3
}

export function monthStatuses(
  enrollment: BetaEnrollment,
  submissions: Pick<BetaFeedbackSubmission, "month_number">[]
): Record<1 | 2 | 3, MonthStatus> {
  const done = new Set(submissions.map((s) => s.month_number))
  const current = currentBetaMonth(enrollment.started_at)
  const result = { 1: "pending", 2: "pending", 3: "pending" } as Record<1 | 2 | 3, MonthStatus>

  for (const m of [1, 2, 3] as const) {
    if (done.has(m)) result[m] = "complete"
    else if (m > current) result[m] = "locked"
    else result[m] = "pending"
  }
  return result
}
