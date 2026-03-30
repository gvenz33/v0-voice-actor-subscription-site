// Script to enable affiliate for gvenz33@gmail.com

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function enableAffiliate() {
  const targetEmail = "gvenz33@gmail.com"
  
  console.log(`Looking for user: ${targetEmail}`)
  
  // Use auth admin API to find user by email
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error("Error listing users:", authError.message)
    process.exit(1)
  }
  
  const authUser = authData.users.find(u => u.email === targetEmail)
  
  if (!authUser) {
    console.error("User not found in auth.users")
    process.exit(1)
  }
  
  console.log("Found auth user with ID:", authUser.id)
  
  // Get profile for this user - only select columns that exist
  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, subscription_tier, feature_overrides")
    .eq("id", authUser.id)
    .single()
  
  if (findError) {
    console.error("Error finding profile:", findError.message)
    process.exit(1)
  }
  
  if (!profile) {
    console.error("Profile not found")
    process.exit(1)
  }
  
  console.log("Found profile:", profile)
  console.log("Current subscription_tier:", profile.subscription_tier)
  console.log("Current feature_overrides:", profile.feature_overrides)
  
  // Remove hasAffiliate: false from feature_overrides if it exists
  const currentOverrides = profile.feature_overrides || {}
  const { hasAffiliate, ...restOverrides } = currentOverrides
  
  console.log("hasAffiliate override value:", hasAffiliate)
  
  // Update the profile - set tier to command and clear any hasAffiliate:false override
  const updateData = {
    subscription_tier: "command",
    feature_overrides: Object.keys(restOverrides).length > 0 ? restOverrides : null,
    updated_at: new Date().toISOString(),
  }
  
  console.log("Updating profile with:", updateData)
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id)
  
  if (updateError) {
    console.error("Error updating user:", updateError.message)
    process.exit(1)
  }
  
  console.log(`Successfully enabled affiliate for ${targetEmail}`)
  console.log(`   - Subscription tier: command`)
  console.log(`   - Removed hasAffiliate override (if any)`)
  console.log("")
  console.log("The user should now see the affiliate dashboard enabled.")
}

enableAffiliate()
