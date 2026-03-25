import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get user's profile with all affiliate-related fields
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("affiliate_code, subscription_tier, feature_overrides, stripe_connect_account_id")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[v0] Profile fetch error:", profileError)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    const tier = profile?.subscription_tier || "free"
    
    // Parse feature_overrides
    let overrides: Record<string, unknown> = {}
    if (profile?.feature_overrides) {
      if (typeof profile.feature_overrides === "string") {
        try {
          overrides = JSON.parse(profile.feature_overrides)
        } catch {
          overrides = {}
        }
      } else {
        overrides = profile.feature_overrides as Record<string, unknown>
      }
    }

    // Calculate eligibility
    const tierEligible = ["momentum", "command"].includes(tier)
    const hasOverride = overrides.hasAffiliate === true
    const isDisabled = overrides.hasAffiliate === false
    const isEligible = (tierEligible || hasOverride) && !isDisabled

    // Get referral stats
    const { data: referrals } = await supabase
      .from("affiliate_referrals")
      .select("id, status, total_earned")
      .eq("affiliate_user_id", user.id)

    const totalReferrals = referrals?.length || 0
    const activeReferrals = referrals?.filter(r => r.status === "active").length || 0
    const totalEarned = referrals?.reduce((sum, r) => sum + (r.total_earned || 0), 0) || 0

    // Get pending payouts
    const { data: pendingPayouts } = await supabase
      .from("affiliate_payouts")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "pending")

    const pendingPaid = pendingPayouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const pendingEarnings = totalEarned - pendingPaid

    return NextResponse.json({
      isEligible,
      subscriptionTier: tier,
      affiliateCode: profile?.affiliate_code || null,
      stripeConnectAccountId: profile?.stripe_connect_account_id || null,
      stats: {
        totalReferrals,
        activeReferrals,
        totalEarned,
        pendingEarnings: Math.max(0, pendingEarnings),
      },
      debug: {
        tier,
        tierEligible,
        hasOverride,
        isDisabled,
        overrides,
      }
    })
  } catch (error) {
    console.error("[v0] Affiliate status error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
