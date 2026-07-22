import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripeConnectStatus, getPlatformStripeInfo } from "@/lib/stripe-connect"
import { getStripeKeySource, getStripeMode, getStripeSecretKey } from "@/lib/stripe"

export async function GET() {
  try {
    const secretKey = getStripeSecretKey()
    if (!secretKey) {
      return NextResponse.json(
        {
          configured: false,
          connected: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          platformConnectEnabled: false,
        },
        { status: 200 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single()

    const [status, platform] = await Promise.all([
      getStripeConnectStatus(profile?.stripe_connect_account_id),
      getPlatformStripeInfo(),
    ])

    return NextResponse.json({
      configured: true,
      stripeMode: getStripeMode(),
      stripeKeySource: getStripeKeySource(),
      platformConnectEnabled: platform.connectEnabled,
      platformStripeAccountId: platform.accountId,
      platformStripeDisplayName: platform.displayName,
      ...status,
    })
  } catch (error) {
    console.error("[billing/connect-status] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Stripe status" },
      { status: 500 }
    )
  }
}
