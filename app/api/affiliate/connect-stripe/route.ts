import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { requireAffiliateEligible } from "@/lib/affiliate-server"

export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured on this deployment." },
        { status: 503 }
      )
    }

    const stripe = getStripe()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const eligibility = await requireAffiliateEligible(
      supabase,
      user.id,
      user.email
    )
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error },
        { status: eligibility.status }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, first_name, last_name")
      .eq("id", user.id)
      .single()

    let accountId = profile?.stripe_connect_account_id

    // Create a new Connect account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          first_name: profile?.first_name || undefined,
          last_name: profile?.last_name || undefined,
          email: user.email,
        },
        metadata: {
          user_id: user.id,
        },
      })

      accountId = account.id

      // Save the account ID to the profile
      await supabase
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", user.id)
    }

    // Create an account link for onboarding
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io"
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/affiliate?stripe=refresh`,
      return_url: `${origin}/dashboard/affiliate?stripe=success`,
      type: "account_onboarding",
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error("[v0] Stripe Connect error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect Stripe" },
      { status: 500 }
    )
  }
}
