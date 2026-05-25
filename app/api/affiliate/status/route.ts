import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAffiliateProgramEnabled } from "@/lib/system-settings"
import { resolveAffiliateAccess } from "@/lib/affiliate-access"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "affiliate_code, subscription_tier, feature_overrides, stripe_connect_account_id, is_superadmin"
      )
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    const programEnabled = await isAffiliateProgramEnabled()
    const access = resolveAffiliateAccess({
      subscriptionTier: profile.subscription_tier,
      featureOverrides: profile.feature_overrides,
      programEnabled,
      isSuperadmin: Boolean(profile.is_superadmin),
    })

    const { data: referrals } = await supabase
      .from("affiliate_referrals")
      .select("id, status, total_earned")
      .eq("affiliate_user_id", user.id)

    const totalReferrals = referrals?.length || 0
    const activeReferrals = referrals?.filter((r) => r.status === "active").length || 0
    const totalEarned =
      referrals?.reduce((sum, r) => sum + (r.total_earned || 0), 0) || 0

    const { data: pendingPayouts } = await supabase
      .from("affiliate_payouts")
      .select("amount")
      .eq("affiliate_user_id", user.id)
      .eq("status", "pending")

    const pendingPaid = pendingPayouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const pendingEarnings = totalEarned - pendingPaid

    return NextResponse.json({
      isEligible: access.isEligible,
      subscriptionTier: access.subscriptionTier,
      tierLabel: access.tierLabel,
      programEnabled: access.programEnabled,
      lockReasons: access.reasons,
      affiliateCode: profile?.affiliate_code || null,
      stripeConnectAccountId: profile?.stripe_connect_account_id || null,
      stats: {
        totalReferrals,
        activeReferrals,
        totalEarned,
        pendingEarnings: Math.max(0, pendingEarnings),
      },
    })
  } catch (error) {
    console.error("[affiliate/status]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
