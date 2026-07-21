import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAppUrl } from "@/lib/oauth-config"
import { FREE_TRIAL_DAYS } from "@/lib/trial"
import { getTransactionalFromAddress } from "@/lib/resend-from"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get("authorization")
  if (secret) {
    return auth === `Bearer ${secret}`
  }
  // Local/dev fallback when CRON_SECRET is not set
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

async function processExpiredTrials() {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  if (!resendApiKey) {
    return { error: "RESEND_API_KEY is not configured", sent: 0, skipped: 0 }
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, trial_ends_at")
    .eq("subscription_tier", "free")
    .eq("trial_exempt", false)
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", nowIso)
    .is("trial_expired_notified_at", null)
    .limit(100)

  if (error) {
    return { error: error.message, sent: 0, skipped: 0 }
  }

  if (!rows?.length) {
    return { sent: 0, skipped: 0 }
  }

  const { Resend } = await import("resend")
  const resend = new Resend(resendApiKey)
  const origin = getAppUrl()
  const upgradeUrl = `${origin}/dashboard/billing`
  let sent = 0
  let skipped = 0

  for (const profile of rows) {
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(
      profile.id,
    )
    const email = authData.user?.email
    if (authError || !email) {
      skipped += 1
      continue
    }

    const displayName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "there"

    const { error: sendError } = await resend.emails.send({
      from: getTransactionalFromAddress(),
      to: email,
      subject: "Your VO Biz Suite free trial has ended",
      text: `Hi ${displayName},

Your ${FREE_TRIAL_DAYS}-day free trial of VO Biz Suite has ended.

Upgrade now to keep managing clients, auditions, bookings, and invoices — and unlock AI tools on Launch, Momentum, or Command:

${upgradeUrl}

— The VO Biz Suite team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1428;">
          <h2 style="margin-bottom: 8px;">Your free trial has ended</h2>
          <p>Hi ${escapeHtml(displayName)},</p>
          <p>
            Your <strong>${FREE_TRIAL_DAYS}-day free trial</strong> of VO Biz Suite has ended.
            Upgrade to keep your CRM workflow going and unlock AI outreach tools.
          </p>
          <p style="margin: 28px 0;">
            <a href="${escapeHtml(upgradeUrl)}"
               style="display: inline-block; background: #2f6b45; color: #f4f0ff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
              Upgrade your plan
            </a>
          </p>
          <p style="font-size: 13px; color: #5c5670;">
            Or visit: <a href="${escapeHtml(upgradeUrl)}" style="color: #5b4db8;">${escapeHtml(upgradeUrl)}</a>
          </p>
          <p style="margin-top: 28px;">— The VO Biz Suite team</p>
        </div>
      `,
    })

    if (sendError) {
      console.error("Trial expiry email failed:", profile.id, sendError)
      skipped += 1
      continue
    }

    await admin
      .from("profiles")
      .update({ trial_expired_notified_at: nowIso })
      .eq("id", profile.id)

    sent += 1
  }

  return { sent, skipped }
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processExpiredTrials()
    if (result.error) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Trial expiry cron error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
