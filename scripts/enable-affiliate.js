// Script to enable affiliate for gvenz33@gmail.com
// Run this with: npx tsx scripts/enable-affiliate.ts

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function enableAffiliate() {
  const targetEmail = "gvenz33@gmail.com"
  
  console.log(`Looking for user: ${targetEmail}`)
  
  // Find the user by email
  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, email, subscription_tier, affiliate_code, feature_overrides")
    .eq("email", targetEmail)
    .single()
  
  if (findError) {
    console.error("Error finding user:", findError.message)
    process.exit(1)
  }
  
  if (!profile) {
    console.error("User not found")
    process.exit(1)
  }
  
  console.log("Found user:", profile)
  
  // Generate affiliate code if not exists
  const affiliateCode = profile.affiliate_code || 
    `VOB${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  
  // Remove hasAffiliate: false from feature_overrides if it exists
  const currentOverrides = profile.feature_overrides || {}
  const { hasAffiliate, ...restOverrides } = currentOverrides
  
  console.log("Current overrides:", currentOverrides)
  console.log("hasAffiliate override value:", hasAffiliate)
  
  // Update the profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "command",
      affiliate_code: affiliateCode,
      feature_overrides: Object.keys(restOverrides).length > 0 ? restOverrides : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
  
  if (updateError) {
    console.error("Error updating user:", updateError.message)
    process.exit(1)
  }
  
  console.log(`✅ Successfully enabled affiliate for ${targetEmail}`)
  console.log(`   - Subscription tier: command`)
  console.log(`   - Affiliate code: ${affiliateCode}`)
  console.log(`   - Removed hasAffiliate override (if any)`)
}

enableAffiliate()
