import { NextResponse } from "next/server"
import { getMyBetaEnrollment, submitBetaFeedback } from "@/lib/beta-feedback"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await getMyBetaEnrollment()
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

  const result = await submitBetaFeedback({
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

  const data = await getMyBetaEnrollment()
  return NextResponse.json({ ok: true, ...data })
}
