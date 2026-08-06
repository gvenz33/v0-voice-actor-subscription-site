import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { adminSetBetaParticipation } from "@/lib/beta-feedback"
import {
  BETA_PROMO_CODE,
  BLUMVOX_PROMO_CODE,
  parseBetaFeedbackProgram,
  type BetaFeedbackProgram,
} from "@/lib/promo-codes"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const { error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: userId } = await context.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("beta_enrollments")
    .select("id, promo_code, program_label, status, participation_enabled, started_at, ends_at")
    .eq("user_id", userId)
    .in("promo_code", [BETA_PROMO_CODE, BLUMVOX_PROMO_CODE])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const byProgram: Record<
    string,
    {
      id: string
      promo_code: string
      program_label: string
      status: string
      participation_enabled: boolean
      started_at: string
      ends_at: string
    }
  > = {}

  for (const row of data ?? []) {
    byProgram[row.promo_code] = {
      ...row,
      participation_enabled: row.participation_enabled !== false,
    }
  }

  return NextResponse.json({
    enrollments: byProgram,
    betaEnabled: byProgram[BETA_PROMO_CODE]?.participation_enabled === true,
    blumvoxEnabled: byProgram[BLUMVOX_PROMO_CODE]?.participation_enabled === true,
  })
}

export async function PATCH(req: Request, context: RouteContext) {
  const { error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: userId } = await context.params
  const body = (await req.json()) as {
    program?: string
    enabled?: boolean
  }

  const program = parseBetaFeedbackProgram(body.program) as BetaFeedbackProgram | null
  if (!program) {
    return NextResponse.json(
      { error: "program must be BETA or BLUMVOX." },
      { status: 400 }
    )
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 })
  }

  const result = await adminSetBetaParticipation(userId, program, body.enabled)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    enrollmentId: result.enrollmentId,
    program,
    enabled: body.enabled,
  })
}
