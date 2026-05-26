import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAffiliateEligible } from "@/lib/affiliate-server"
import {
  generateAffiliateCode,
  validateCustomAffiliateCode,
  buildAffiliateReferralUrl,
} from "@/lib/affiliate-code"

async function generateUniqueCode(): Promise<string> {
  const admin = createAdminClient()
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateAffiliateCode()
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("affiliate_code", code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error("Could not generate a unique affiliate code")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const eligibility = await requireAffiliateEligible(
      supabase,
      user.id,
      user.email
    )
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error },
        { status: eligibility.status }
      )
    }

    const body = (await request.json()) as {
      mode?: "auto" | "custom"
      code?: string
      replace?: boolean
    }

    if (body.mode !== "auto" && body.mode !== "custom") {
      return NextResponse.json(
        { error: 'mode must be "auto" or "custom"' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("affiliate_code")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 500 })
    }

    const { count: referralCount } = await supabase
      .from("affiliate_referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_user_id", user.id)

    const hasCode = Boolean(profile.affiliate_code?.trim())
    const hasReferrals = (referralCount ?? 0) > 0

    if (hasCode && hasReferrals) {
      return NextResponse.json(
        {
          error:
            "Your referral code is locked because you already have referrals. Contact support if you need help.",
        },
        { status: 409 }
      )
    }

    if (hasCode && !body.replace) {
      return NextResponse.json(
        {
          error:
            "You already have a referral code. Pass replace: true to change it before you have referrals.",
          affiliateCode: profile.affiliate_code,
        },
        { status: 409 }
      )
    }

    let newCode: string
    if (body.mode === "custom") {
      const validated = validateCustomAffiliateCode(body.code ?? "")
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 })
      }
      newCode = validated.code
    } else {
      newCode = await generateUniqueCode()
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({ affiliate_code: newCode, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("affiliate_code")
      .single()

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "That referral code is already taken. Try another." },
          { status: 409 }
        )
      }
      console.error("[affiliate/code] update", updateError)
      return NextResponse.json({ error: "Failed to save referral code" }, { status: 500 })
    }

    const siteOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io"
    const affiliateCode = updated.affiliate_code ?? newCode

    return NextResponse.json({
      affiliateCode,
      referralUrl: buildAffiliateReferralUrl(affiliateCode, siteOrigin),
    })
  } catch (error) {
    console.error("[affiliate/code]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
