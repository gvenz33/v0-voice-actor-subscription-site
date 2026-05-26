import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAffiliateEligible } from "@/lib/affiliate-server"
import {
  getOrCreateAffiliateProfile,
  countAffiliateReferrals,
  assignGeneratedAffiliateCode,
  saveAffiliateCode,
} from "@/lib/affiliate-profile"
import {
  validateCustomAffiliateCode,
  buildAffiliateReferralUrl,
} from "@/lib/affiliate-code"

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

    let profile
    try {
      profile = await getOrCreateAffiliateProfile(supabase, {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      })
    } catch (profileError) {
      console.error("[affiliate/code] profile", profileError)
      return NextResponse.json(
        {
          error:
            profileError instanceof Error
              ? profileError.message
              : "Could not load your account profile. Please try again or contact support.",
        },
        { status: 500 }
      )
    }

    const referralCount = await countAffiliateReferrals(supabase, user.id)
    const hasCode = Boolean(profile.affiliate_code?.trim())
    const hasReferrals = referralCount > 0

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

    let affiliateCode: string
    try {
      if (body.mode === "custom") {
        const validated = validateCustomAffiliateCode(body.code ?? "")
        if (!validated.ok) {
          return NextResponse.json({ error: validated.error }, { status: 400 })
        }
        affiliateCode = await saveAffiliateCode(
          supabase,
          user.id,
          validated.code
        )
      } else {
        affiliateCode = await assignGeneratedAffiliateCode(supabase, user.id)
      }
    } catch (saveError) {
      if (saveError instanceof Error && saveError.message === "CODE_TAKEN") {
        return NextResponse.json(
          { error: "That referral code is already taken. Try another." },
          { status: 409 }
        )
      }
      console.error("[affiliate/code] save", saveError)
      return NextResponse.json(
        {
          error:
            saveError instanceof Error
              ? saveError.message
              : "Failed to save referral code",
        },
        { status: 500 }
      )
    }

    const siteOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io"

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
