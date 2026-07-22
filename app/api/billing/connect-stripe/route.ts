import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createStripeConnectOnboardingLink,
  ensureStripeConnectAccount,
} from "@/lib/stripe-connect"

export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured on this deployment." },
        { status: 503 }
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
      refreshUrl: `${origin}/dashboard/billing?stripe=refresh`,
      returnUrl: `${origin}/dashboard/billing?stripe=success`,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[billing/connect-stripe] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect Stripe" },
      { status: 500 }
    )
  }
}
