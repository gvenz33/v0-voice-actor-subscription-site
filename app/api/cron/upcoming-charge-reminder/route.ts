import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe"
import { getAppUrl } from "@/lib/oauth-config"
import { getTransactionalFromAddress } from "@/lib/resend-from"
import { formatCents } from "@/lib/promo-codes"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const REMINDER_DAYS_BEFORE = 4
const PAID_TIERS = ["launch", "momentum", "command"] as const

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get("authorization")
  if (secret) {
    return auth === `Bearer ${secret}`
  }
  const ua = request.headers.get("user-agent") || ""
  return ua.includes("vercel-cron") || process.env.NODE_ENV !== "production"
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatChargeDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

async function processUpcomingChargeReminders() {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  if (!resendApiKey) {
    return { error: "RESEND_API_KEY is not configured", sent: 0, skipped: 0 }
  }

  const admin = createAdminClient()
  const stripe = getStripe()
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now + REMINDER_DAYS_BEFORE * 24 * 60 * 60
  const windowEnd = windowStart + 24 * 60 * 60

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, first_name, last_name, stripe_customer_id, subscription_tier, upcoming_charge_notified_period_end"
    )
    .in("subscription_tier", [...PAID_TIERS])
    .not("stripe_customer_id", "is", null)
    .limit(200)

  if (error) {
    return { error: error.message, sent: 0, skipped: 0 }
  }

  if (!profiles?.length) {
    return { sent: 0, skipped: 0 }
  }

  const { Resend } = await import("resend")
  const resend = new Resend(resendApiKey)
  const origin = getAppUrl()
  const billingUrl = `${origin}/dashboard/billing`

  let sent = 0
  let skipped = 0

  for (const profile of profiles) {
    const customerId = profile.stripe_customer_id
    if (!customerId) {
      skipped += 1
      continue
    }

    let subscriptions
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 5,
      })
    } catch (err) {
      console.error("[upcoming-charge] list subscriptions failed:", profile.id, err)
      skipped += 1
      continue
    }

    const dueSoon = subscriptions.data.find((sub) => {
      if (sub.cancel_at_period_end) return false
      if (sub.collection_method && sub.collection_method !== "charge_automatically") {
        // Still remind if somehow send_invoice — but we target auto-bill primarily
      }
      const periodEnd = sub.current_period_end
      return periodEnd >= windowStart && periodEnd < windowEnd
    })

    if (!dueSoon) {
      skipped += 1
      continue
    }

    const periodEndUnix = dueSoon.current_period_end
    const alreadyNotifiedUnix = profile.upcoming_charge_notified_period_end
      ? Math.floor(new Date(profile.upcoming_charge_notified_period_end).getTime() / 1000)
      : null
    if (alreadyNotifiedUnix === periodEndUnix) {
      skipped += 1
      continue
    }

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(
      profile.id
    )
    const email = authData.user?.email
    if (authError || !email) {
      skipped += 1
      continue
    }

    let amountLabel = "your upcoming subscription renewal"
    try {
      const upcoming = await stripe.invoices.createPreview({
        customer: customerId,
        subscription: dueSoon.id,
      })
      if (typeof upcoming.amount_due === "number" && upcoming.amount_due > 0) {
        amountLabel = formatCents(upcoming.amount_due)
      }
    } catch {
      const item = dueSoon.items.data[0]
      const unit =
        typeof item?.price === "object" && item.price?.unit_amount != null
          ? item.price.unit_amount
          : null
      if (unit != null) amountLabel = formatCents(unit)
    }

    const displayName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "there"
    const chargeDate = formatChargeDate(dueSoon.current_period_end)
    const planLabel =
      (dueSoon.metadata?.tier || profile.subscription_tier || "your plan").toString()

    const { error: sendError } = await resend.emails.send({
      from: getTransactionalFromAddress(),
      to: email,
      subject: `Reminder: VO Biz Suite renews in ${REMINDER_DAYS_BEFORE} days`,
      text: `Hi ${displayName},

This is a reminder that your VO Biz Suite subscription (${planLabel}) will automatically renew and charge ${amountLabel} on ${chargeDate} (UTC).

No action is needed if you want to keep your plan. To review billing details or update your payment method:

${billingUrl}

— The VO Biz Suite team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1428;">
          <h2 style="margin-bottom: 8px;">Upcoming subscription charge</h2>
          <p>Hi ${escapeHtml(displayName)},</p>
          <p>
            Your <strong>VO Biz Suite</strong> subscription
            (<strong>${escapeHtml(planLabel)}</strong>) will automatically renew and charge
            <strong>${escapeHtml(amountLabel)}</strong> on
            <strong>${escapeHtml(chargeDate)}</strong> (UTC).
          </p>
          <p>No action is needed if you want to keep your plan.</p>
          <p style="margin: 28px 0;">
            <a href="${escapeHtml(billingUrl)}"
               style="display: inline-block; background: #2f6b45; color: #f4f0ff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
              Review billing
            </a>
          </p>
          <p style="font-size: 13px; color: #5c5670;">
            Or visit: <a href="${escapeHtml(billingUrl)}" style="color: #5b4db8;">${escapeHtml(billingUrl)}</a>
          </p>
          <p style="margin-top: 28px;">— The VO Biz Suite team</p>
        </div>
      `,
    })

    if (sendError) {
      console.error("[upcoming-charge] email failed:", profile.id, sendError)
      skipped += 1
      continue
    }

    await admin
      .from("profiles")
      .update({
        upcoming_charge_notified_period_end: new Date(periodEndUnix * 1000).toISOString(),
      })
      .eq("id", profile.id)

    sent += 1
  }

  return { sent, skipped, windowStart, windowEnd }
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processUpcomingChargeReminders()
    if (result.error) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Upcoming charge reminder cron error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
