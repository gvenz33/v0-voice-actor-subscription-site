import { NextResponse } from "next/server"
import { getMyBetaEnrollment, submitBetaFeedback } from "@/lib/beta-feedback"
import { createClient } from "@/lib/supabase/server"
import { parseBetaFeedbackProgram } from "@/lib/promo-codes"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const program = parseBetaFeedbackProgram(new URL(request.url).searchParams.get("program"))
  const data = await getMyBetaEnrollment(program)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    program?: string
    monthNumber?: number
    featureUsedMost?: string
    confusingOrDifficult?: string
    moreUseful?: string
    savedTimeOrOrganized?: string
    wouldRecommend?: boolean
    referralNote?: string
  }

  const monthNumber = body.monthNumber
  if (monthNumber !== 1 && monthNumber !== 2 && monthNumber !== 3) {
    return NextResponse.json({ error: "monthNumber must be 1, 2, or 3." }, { status: 400 })
  }

  const program = parseBetaFeedbackProgram(body.program)
  const result = await submitBetaFeedback({
    program,
    monthNumber,
    featureUsedMost: body.featureUsedMost ?? "",
    confusingOrDifficult: body.confusingOrDifficult ?? "",
    moreUseful: body.moreUseful ?? "",
    savedTimeOrOrganized: body.savedTimeOrOrganized ?? "",
    wouldRecommend: Boolean(body.wouldRecommend),
    referralNote: body.referralNote,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const data = await getMyBetaEnrollment(program)
  return NextResponse.json({ ok: true, ...data })
}
