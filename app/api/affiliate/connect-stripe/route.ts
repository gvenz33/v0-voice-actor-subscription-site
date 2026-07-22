import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createStripeConnectOnboardingLink,
  ensureStripeConnectAccount,
  formatStripeConnectError,
} from "@/lib/stripe-connect"
import { requireAffiliateEligible } from "@/lib/affiliate-server"

export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured on this deployment." },
        { status: 503 }
      )
    }

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, first_name, last_name")
      .eq("id", user.id)
      .single()

    const accountId = await ensureStripeConnectAccount({
      userId: user.id,
      email: user.email ?? "",
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      existingAccountId: profile?.stripe_connect_account_id,
    })

    if (accountId !== profile?.stripe_connect_account_id) {
      await supabase
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", user.id)
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io"
    const url = await createStripeConnectOnboardingLink({
      accountId,
      refreshUrl: `${origin}/dashboard/affiliate?stripe=refresh`,
      returnUrl: `${origin}/dashboard/affiliate?stripe=success`,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[v0] Stripe Connect error:", error)
    return NextResponse.json(
      { error: formatStripeConnectError(error) },
      { status: 500 }
    )
  }
}
