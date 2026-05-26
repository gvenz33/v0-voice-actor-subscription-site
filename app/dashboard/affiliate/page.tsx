import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAffiliateProgramEnabled } from "@/lib/system-settings"
import { resolveAffiliateContext } from "@/lib/affiliate-context"
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
  const ctx = resolveAffiliateContext({
    userEmail: user.email,
    subscriptionTier: profile?.subscription_tier,
    featureOverrides: profile?.feature_overrides,
    programEnabled,
    isSuperadmin: Boolean(profile?.is_superadmin),
  })

  return (
    <AffiliatePageClient
      initial={{
        subscriptionTier: ctx.subscriptionTier,
        tierLabel: ctx.tierLabel,
        isEligible: ctx.isEligible,
        lockReasons: ctx.lockReasons,
        programEnabled: ctx.programEnabled,
        affiliateCode: profile?.affiliate_code ?? "",
        stripeConnectAccountId: profile?.stripe_connect_account_id ?? null,
      }}
    />
  )
}
