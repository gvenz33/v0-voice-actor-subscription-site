import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAffiliateProgramEnabled } from "@/lib/system-settings"
import { resolveAffiliateAccess } from "@/lib/affiliate-access"
import AffiliatePageClient from "./affiliate-page-client"

export default async function AffiliatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "affiliate_code, subscription_tier, feature_overrides, stripe_connect_account_id, is_superadmin"
    )
    .eq("id", user.id)
    .single()

  const programEnabled = await isAffiliateProgramEnabled()
  const access = resolveAffiliateAccess({
    subscriptionTier: profile?.subscription_tier,
    featureOverrides: profile?.feature_overrides,
    programEnabled,
    isSuperadmin: Boolean(profile?.is_superadmin),
  })

  return (
    <AffiliatePageClient
      initial={{
        subscriptionTier: access.subscriptionTier,
        tierLabel: access.tierLabel,
        isEligible: access.isEligible,
        lockReasons: access.reasons,
        programEnabled: access.programEnabled,
        affiliateCode: profile?.affiliate_code ?? "",
        stripeConnectAccountId: profile?.stripe_connect_account_id ?? null,
      }}
    />
  )
}
