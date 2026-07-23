import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  BETA_FEEDBACK_PROGRAM_CODES,
  isThoughtfulFeedback,
  normalizePromoCode,
  type BetaFeedbackProgram,
} from "@/lib/promo-codes"
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

export async function getMyBetaEnrollment(
  program?: BetaFeedbackProgram | null
): Promise<{
  enrollment: BetaEnrollment | null
  submissions: BetaFeedbackSubmission[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { enrollment: null, submissions: [] }

  let query = supabase
    .from("beta_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })

  if (program) {
    query = query.eq("promo_code", program)
  } else {
    query = query.in("promo_code", [...BETA_FEEDBACK_PROGRAM_CODES])
  }

  const { data: enrollments } = await query

  const enrollment = (enrollments?.[0] as BetaEnrollment | undefined) ?? null
  if (!enrollment) return { enrollment: null, submissions: [] }

  // BlumVox initial window ended without all feedback → regular monthly rate
  if (
    normalizePromoCode(enrollment.promo_code) === "BLUMVOX" &&
    enrollment.status === "active_beta" &&
    new Date(enrollment.ends_at).getTime() < Date.now()
  ) {
    const admin = createAdminClient()
    await admin
      .from("beta_enrollments")
      .update({ status: "regular_rate", updated_at: new Date().toISOString() })
      .eq("id", enrollment.id)
    enrollment.status = "regular_rate"
    try {
      const { convertBlumvoxToRegularMonthly } = await import("@/lib/blumvox-billing")
      await convertBlumvoxToRegularMonthly(user.id)
    } catch (err) {
      console.error("[blumvox] regular monthly conversion failed:", err)
    }
  }

  const { data: submissions } = await supabase
    .from("beta_feedback_submissions")
    .select("*")
    .eq("enrollment_id", enrollment.id)
    .order("month_number", { ascending: true })

  return {
    enrollment,
    submissions: (submissions as BetaFeedbackSubmission[]) ?? [],
  }
}

export async function submitBetaFeedback(
  input: BetaFeedbackInput & { program?: BetaFeedbackProgram | null }
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

  const { enrollment } = await getMyBetaEnrollment(input.program)
  if (!enrollment) {
    return { ok: false, error: "No beta enrollment found for your account." }
  }

  const { currentBetaMonth } = await import("@/lib/beta-feedback-shared")
  const current = currentBetaMonth(enrollment.started_at)
  if (input.monthNumber > current) {
    return { ok: false, error: `Month ${input.monthNumber} is not open yet.` }
  }

  const referralNote =
    input.wouldRecommend
      ? input.referralNote?.trim() ||
        "Interested in referring — see Affiliate tab for unique URL."
      : input.referralNote?.trim() || null

  const { error } = await supabase.from("beta_feedback_submissions").insert({
    enrollment_id: enrollment.id,
    user_id: user.id,
    month_number: input.monthNumber,
    feature_used_most: input.featureUsedMost.trim(),
    confusing_or_difficult: input.confusingOrDifficult.trim(),
    more_useful: input.moreUseful.trim(),
    saved_time_or_organized: input.savedTimeOrOrganized.trim(),
    would_recommend: input.wouldRecommend,
    referral_note: referralNote,
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

    if (normalizePromoCode(enrollment.promo_code) === "BLUMVOX") {
      try {
        const { convertBlumvoxToRetainedMonthly } = await import("@/lib/blumvox-billing")
        await convertBlumvoxToRetainedMonthly(user.id)
      } catch (err) {
        console.error("[blumvox] retained monthly conversion failed:", err)
      }
    }
  }

  return { ok: true }
}

export async function ensureBetaEnrollmentForUser(
  userId: string,
  promoCode: string,
  promoRedemptionId?: string | null
) {
  const code = normalizePromoCode(promoCode)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("ensure_beta_enrollment", {
    p_user_id: userId,
    p_promo_code: code,
    p_promo_redemption_id: promoRedemptionId ?? null,
  })
  if (error) {
    console.error("[beta] ensure enrollment failed:", error)
    return null
  }
  return data as string | null
}

export async function listAdminBetaParticipants(program?: BetaFeedbackProgram | null) {
  const supabase = await createClient()
  let query = supabase
    .from("beta_enrollments")
    .select("*")
    .order("started_at", { ascending: false })

  if (program) {
    query = query.eq("promo_code", program)
  }

  const { data: enrollments, error } = await query

  if (error) throw new Error(error.message)

  const enrollmentList = (enrollments as BetaEnrollment[]) ?? []
  const userIds = [...new Set(enrollmentList.map((e) => e.user_id))]
  const enrollmentIds = enrollmentList.map((e) => e.id)

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, business_name, subscription_tier")
        .in("id", userIds)
    : { data: [] }

  const { data: submissions } = enrollmentIds.length
    ? await supabase
        .from("beta_feedback_submissions")
        .select("*")
        .in("enrollment_id", enrollmentIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  return {
    enrollments: enrollmentList,
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
