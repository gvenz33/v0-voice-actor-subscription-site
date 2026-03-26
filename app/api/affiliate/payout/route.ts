import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { amount, method } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!method || !["stripe", "credit"].includes(method)) {
      return NextResponse.json({ error: "Invalid payout method" }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_customer_id, subscription_credit")
      .eq("id", user.id)
      .single()

    if (method === "stripe") {
      // Payout to Stripe Connect account
      if (!profile?.stripe_connect_account_id) {
        return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 })
      }

      // Create a transfer to the connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        destination: profile.stripe_connect_account_id,
        description: "VO Biz Suite affiliate commission payout",
      })

      // Record the payout
      await supabase.from("affiliate_payouts").insert({
        affiliate_user_id: user.id,
        amount,
        status: "processing",
        payout_method: "stripe",
        payout_details: { transfer_id: transfer.id },
      })

      // Update referral statuses to paid
      await supabase
        .from("affiliate_referrals")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("affiliate_user_id", user.id)
        .eq("status", "active")

      return NextResponse.json({ success: true, transfer_id: transfer.id })
    } else if (method === "credit") {
      // Apply as subscription credit
      const currentCredit = profile?.subscription_credit || 0
      const newCredit = currentCredit + amount

      // Update user's subscription credit
      await supabase
        .from("profiles")
        .update({ subscription_credit: newCredit })
        .eq("id", user.id)

      // Record the payout
      await supabase.from("affiliate_payouts").insert({
        affiliate_user_id: user.id,
        amount,
        status: "paid",
        payout_method: "credit",
        payout_details: { applied_credit: amount, new_balance: newCredit },
        paid_at: new Date().toISOString(),
      })

      // Update referral statuses to paid
      await supabase
        .from("affiliate_referrals")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("affiliate_user_id", user.id)
        .eq("status", "active")

      return NextResponse.json({ success: true, credit_balance: newCredit })
    }

    return NextResponse.json({ error: "Invalid method" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Payout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process payout" },
      { status: 500 }
    )
  }
}
