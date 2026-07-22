import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripeConnectStatus } from "@/lib/stripe-connect"

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { configured: false, connected: false, chargesEnabled: false, detailsSubmitted: false },
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

    const status = await getStripeConnectStatus(profile?.stripe_connect_account_id)

    return NextResponse.json({
      configured: true,
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
