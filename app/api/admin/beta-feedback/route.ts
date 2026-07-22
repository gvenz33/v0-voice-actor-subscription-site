import { NextResponse } from "next/server"
import {
  adminSetEnrollmentStatus,
  listAdminBetaParticipants,
  type BetaEnrollmentStatus,
} from "@/lib/beta-feedback"
import { monthStatuses } from "@/lib/beta-feedback-shared"
import { requireAdmin } from "@/lib/admin-auth"

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

  const { enrollments, submissions, profiles } = await listAdminBetaParticipants()

  if (exportCsv) {
    const header = [
      "enrollment_id",
      "user_id",
      "student_name",
      "business_name",
      "tier",
      "promo_code",
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
            sub.created_at,
          ]
            .map(escape)
            .join(",")
        )
      }
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="beta-feedback.csv"`,
      },
    })
  }

  return NextResponse.json({
    enrollments,
    submissions,
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
