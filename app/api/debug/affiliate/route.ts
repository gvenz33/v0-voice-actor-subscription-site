import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ 
      error: "Not authenticated", 
      details: userError?.message 
    }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, subscription_tier, feature_overrides, affiliate_code")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile,
    profileError: profileError?.message,
    eligibilityCheck: {
      tier: profile?.subscription_tier,
      tierEligible: ["momentum", "command"].includes(profile?.subscription_tier || ""),
      featureOverrides: profile?.feature_overrides,
      hasAffiliateOverride: profile?.feature_overrides?.hasAffiliate === true,
      isAffiliateDisabled: profile?.feature_overrides?.hasAffiliate === false,
    }
  })
}
