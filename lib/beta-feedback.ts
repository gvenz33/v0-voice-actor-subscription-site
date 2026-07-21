import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { BLUMVOX_PROMO_CODE, isThoughtfulFeedback } from "@/lib/promo-codes"
import type {
  BetaEnrollment,
  BetaEnrollmentStatus,
  BetaFeedbackInput,
  BetaFeedbackSubmission,
} from "@/lib/beta-feedback-shared"

export type {
  BetaEnrollment,
  BetaEnrollmentStatus,
  BetaFeedbackInput,
  BetaFeedbackSubmission,
  MonthStatus,
} from "@/lib/beta-feedback-shared"

export { currentBetaMonth, monthStatuses } from "@/lib/beta-feedback-shared"

export async function getMyBetaEnrollment(): Promise<{
  enrollment: BetaEnrollment | null
  submissions: BetaFeedbackSubmission[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { enrollment: null, submissions: [] }

  const { data: enrollment } = await supabase
    .from("beta_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("promo_code", BLUMVOX_PROMO_CODE)
    .maybeSingle()

  if (!enrollment) return { enrollment: null, submissions: [] }

  const { data: submissions } = await supabase
    .from("beta_feedback_submissions")
    .select("*")
    .eq("enrollment_id", enrollment.id)
    .order("month_number", { ascending: true })

  return {
    enrollment: enrollment as BetaEnrollment,
    submissions: (submissions as BetaFeedbackSubmission[]) ?? [],
  }
}

export async function submitBetaFeedback(
  input: BetaFeedbackInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fields = [
    input.featureUsedMost,
    input.confusingOrDifficult,
    input.moreUseful,
    input.savedTimeOrOrganized,
  ]
  if (!fields.every(isThoughtfulFeedback)) {
    return {
      ok: false,
      error:
        "Please provide thoughtful, usable responses (at least a short sentence) for each text question.",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const { data: enrollment } = await supabase
    .from("beta_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("promo_code", BLUMVOX_PROMO_CODE)
    .maybeSingle()

  if (!enrollment) {
    return { ok: false, error: "No BVS Beta enrollment found for your account." }
  }

  const { currentBetaMonth } = await import("@/lib/beta-feedback-shared")
  const current = currentBetaMonth(enrollment.started_at)
  if (input.monthNumber > current) {
    return { ok: false, error: `Month ${input.monthNumber} is not open yet.` }
  }

  const { error } = await supabase.from("beta_feedback_submissions").insert({
    enrollment_id: enrollment.id,
    user_id: user.id,
    month_number: input.monthNumber,
    feature_used_most: input.featureUsedMost.trim(),
    confusing_or_difficult: input.confusingOrDifficult.trim(),
    more_useful: input.moreUseful.trim(),
    saved_time_or_organized: input.savedTimeOrOrganized.trim(),
    would_recommend: input.wouldRecommend,
    referral_note: input.referralNote?.trim() || null,
  })

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `Month ${input.monthNumber} feedback was already submitted.` }
    }
    return { ok: false, error: error.message }
  }

  const { data: all } = await supabase
    .from("beta_feedback_submissions")
    .select("month_number")
    .eq("enrollment_id", enrollment.id)

  const months = new Set((all ?? []).map((r: { month_number: number }) => r.month_number))
  if (months.has(1) && months.has(2) && months.has(3) && enrollment.status === "active_beta") {
    await supabase
      .from("beta_enrollments")
      .update({ status: "retained_discount", updated_at: new Date().toISOString() })
      .eq("id", enrollment.id)
  }

  return { ok: true }
}

export async function ensureBetaEnrollmentForUser(
  userId: string,
  promoCode: string,
  promoRedemptionId?: string | null
) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("ensure_beta_enrollment", {
    p_user_id: userId,
    p_promo_code: promoCode,
    p_promo_redemption_id: promoRedemptionId ?? null,
  })
  if (error) {
    console.error("[beta] ensure enrollment failed:", error)
    return null
  }
  return data as string | null
}

export async function listAdminBetaParticipants() {
  const supabase = await createClient()
  const { data: enrollments, error } = await supabase
    .from("beta_enrollments")
    .select("*")
    .order("started_at", { ascending: false })

  if (error) throw new Error(error.message)

  const userIds = [...new Set((enrollments ?? []).map((e: BetaEnrollment) => e.user_id))]
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, business_name, subscription_tier")
        .in("id", userIds)
    : { data: [] }

  const { data: submissions } = await supabase
    .from("beta_feedback_submissions")
    .select("*")
    .order("created_at", { ascending: false })

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  return {
    enrollments: (enrollments as BetaEnrollment[]) ?? [],
    submissions: (submissions as BetaFeedbackSubmission[]) ?? [],
    profiles: profileMap,
  }
}

export async function adminSetEnrollmentStatus(
  enrollmentId: string,
  status: BetaEnrollmentStatus
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("beta_enrollments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", enrollmentId)
  if (error) throw new Error(error.message)
}
