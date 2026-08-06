import { NextResponse } from "next/server"
import {
  adminSetEnrollmentStatus,
  listAdminBetaParticipants,
  type BetaEnrollmentStatus,
} from "@/lib/beta-feedback"
import { monthStatuses } from "@/lib/beta-feedback-shared"
import { requireAdmin } from "@/lib/admin-auth"
import { parseBetaFeedbackProgram } from "@/lib/promo-codes"
import { createAdminClient } from "@/lib/supabase/admin"
import { BETA_FEEDBACK_BUCKET } from "@/lib/beta-feedback-media"

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (gate.error === "Unauthorized") {
    return NextResponse.json({ error: gate.error }, { status: 401 })
  }
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const exportCsv = searchParams.get("export") === "csv"
  const program = parseBetaFeedbackProgram(searchParams.get("program"))

  const { enrollments, submissions, profiles } = await listAdminBetaParticipants(program)

  if (exportCsv) {
    const header = [
      "enrollment_id",
      "user_id",
      "student_name",
      "business_name",
      "tier",
      "promo_code",
      "participation_enabled",
      "status",
      "started_at",
      "ends_at",
      "month_1",
      "month_2",
      "month_3",
      "submission_id",
      "month_number",
      "feature_used_most",
      "confusing_or_difficult",
      "more_useful",
      "saved_time_or_organized",
      "would_recommend",
      "referral_note",
      "attachment_count",
      "submitted_at",
    ]

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }

    const rows: string[] = [header.join(",")]

    for (const enrollment of enrollments) {
      const profile = profiles.get(enrollment.user_id) as
        | {
            first_name?: string | null
            last_name?: string | null
            business_name?: string | null
            subscription_tier?: string | null
          }
        | undefined
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || ""
      const studentSubs = submissions.filter((s) => s.enrollment_id === enrollment.id)
      const statuses = monthStatuses(enrollment, studentSubs)

      if (studentSubs.length === 0) {
        rows.push(
          [
            enrollment.id,
            enrollment.user_id,
            name,
            profile?.business_name ?? "",
            profile?.subscription_tier ?? "",
            enrollment.promo_code,
            enrollment.participation_enabled === false ? "no" : "yes",
            enrollment.status,
            enrollment.started_at,
            enrollment.ends_at,
            statuses[1],
            statuses[2],
            statuses[3],
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "0",
            "",
          ]
            .map(escape)
            .join(",")
        )
        continue
      }

      for (const sub of studentSubs) {
        rows.push(
          [
            enrollment.id,
            enrollment.user_id,
            name,
            profile?.business_name ?? "",
            profile?.subscription_tier ?? "",
            enrollment.promo_code,
            enrollment.participation_enabled === false ? "no" : "yes",
            enrollment.status,
            enrollment.started_at,
            enrollment.ends_at,
            statuses[1],
            statuses[2],
            statuses[3],
            sub.id,
            sub.month_number,
            sub.feature_used_most,
            sub.confusing_or_difficult,
            sub.more_useful,
            sub.saved_time_or_organized,
            sub.would_recommend ? "yes" : "no",
            sub.referral_note ?? "",
            Array.isArray(sub.attachments) ? sub.attachments.length : 0,
            sub.created_at,
          ]
            .map(escape)
            .join(",")
        )
      }
    }

    const filename =
      program === "BLUMVOX"
        ? "bvs-beta-feedback.csv"
        : program === "BETA"
          ? "beta-feedback.csv"
          : "all-beta-feedback.csv"

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  // Sign screenshot URLs for admin review
  const admin = createAdminClient()
  const submissionsWithUrls = await Promise.all(
    submissions.map(async (sub) => {
      const attachments = Array.isArray(sub.attachments) ? sub.attachments : []
      const withUrls = await Promise.all(
        attachments.map(async (att) => {
          const { data } = await admin.storage
            .from(BETA_FEEDBACK_BUCKET)
            .createSignedUrl(att.storage_path, 60 * 60)
          return { ...att, signed_url: data?.signedUrl ?? null }
        })
      )
      return { ...sub, attachments: withUrls }
    })
  )

  return NextResponse.json({
    enrollments,
    submissions: submissionsWithUrls,
    profiles: Object.fromEntries(profiles),
  })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin()
  if (gate.error === "Unauthorized") {
    return NextResponse.json({ error: gate.error }, { status: 401 })
  }
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: 403 })
  }

  const body = (await request.json()) as {
    enrollmentId?: string
    status?: BetaEnrollmentStatus
  }

  if (!body.enrollmentId || !body.status) {
    return NextResponse.json({ error: "enrollmentId and status required" }, { status: 400 })
  }

  if (!["active_beta", "retained_discount", "regular_rate"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  await adminSetEnrollmentStatus(body.enrollmentId, body.status)
  return NextResponse.json({ ok: true })
}
