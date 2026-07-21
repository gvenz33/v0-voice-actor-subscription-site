/**
 * One-off: notify expired free-trial users via Resend + Supabase Auth Admin API.
 * Usage: node --env-file=.env.cron.tmp scripts/send-trial-expiry-once.mjs
 */
const FREE_TRIAL_DAYS = 14
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "")
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const resendKey = process.env.RESEND_API_KEY
const origin = (process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io").replace(/\/$/, "")

if (!url || !serviceKey || !resendKey) {
  console.error("Missing Supabase URL, service role key, or RESEND_API_KEY")
  process.exit(1)
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
}

const nowIso = new Date().toISOString()
const listUrl =
  `${url}/rest/v1/profiles?select=id,first_name,last_name,trial_ends_at` +
  `&subscription_tier=eq.free&trial_exempt=eq.false&trial_ends_at=not.is.null` +
  `&trial_ends_at=lte.${encodeURIComponent(nowIso)}&trial_expired_notified_at=is.null&limit=100`

const listRes = await fetch(listUrl, { headers: { ...headers, Prefer: "count=exact" } })
if (!listRes.ok) {
  console.error("list failed", listRes.status, await listRes.text())
  process.exit(1)
}
const rows = await listRes.json()
console.log(`Found ${rows.length} expired free-trial user(s)`)

const upgradeUrl = `${origin}/dashboard/billing`
let sent = 0

for (const profile of rows) {
  const userRes = await fetch(`${url}/auth/v1/admin/users/${profile.id}`, { headers })
  if (!userRes.ok) {
    console.log("skip auth", profile.id, userRes.status)
    continue
  }
  const authJson = await userRes.json()
  const email = authJson.user?.email || authJson.email
  if (!email) {
    console.log("skip no email", profile.id)
    continue
  }
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "there"

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL?.includes("<")
        ? process.env.RESEND_FROM_EMAIL
        : process.env.RESEND_FROM_EMAIL
          ? `VO Biz Suite <${process.env.RESEND_FROM_EMAIL}>`
          : "VO Biz Suite <noreply@gotmyrent.com>",
      to: [email],
      subject: "Your VO Biz Suite free trial has ended",
      text: `Hi ${displayName},\n\nYour ${FREE_TRIAL_DAYS}-day free trial of VO Biz Suite has ended.\n\nUpgrade now: ${upgradeUrl}\n\n— The VO Biz Suite team`,
      html: `<p>Hi ${displayName},</p><p>Your ${FREE_TRIAL_DAYS}-day free trial of VO Biz Suite has ended.</p><p><a href="${upgradeUrl}">Upgrade your plan</a></p><p>— The VO Biz Suite team</p>`,
    }),
  })
  if (!sendRes.ok) {
    console.error("send failed", email, await sendRes.text())
    continue
  }

  const upd = await fetch(`${url}/rest/v1/profiles?id=eq.${profile.id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ trial_expired_notified_at: nowIso }),
  })
  if (!upd.ok) {
    console.error("mark notified failed", profile.id, await upd.text())
  }

  console.log("sent", email)
  sent += 1
}

console.log(`Done. Sent ${sent}.`)
