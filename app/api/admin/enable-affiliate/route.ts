import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  
  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  const { email } = await request.json()
  
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }
  
  // Find the user by email in profiles (profiles has email column synced from auth)
  const { data: targetProfile, error: findError } = await supabase
    .from("profiles")
    .select("id, email, subscription_tier, affiliate_code, feature_overrides")
    .eq("email", email)
    .single()
  
  if (findError || !targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  
  // Generate affiliate code if not exists
  const affiliateCode = targetProfile.affiliate_code || 
    `VOB${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  
  // Remove hasAffiliate: false from feature_overrides if it exists
  const currentOverrides = targetProfile.feature_overrides || {}
  const { hasAffiliate, ...restOverrides } = currentOverrides as { hasAffiliate?: boolean; [key: string]: unknown }
  
  // Update the profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "command",
      affiliate_code: affiliateCode,
      feature_overrides: Object.keys(restOverrides).length > 0 ? restOverrides : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetProfile.id)
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  
  return NextResponse.json({ 
    success: true, 
    message: `Affiliate enabled for ${email}`,
    affiliateCode 
  })
}
