import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  formatAffiliateCommissionPercent,
  getAffiliateCommissionRate,
  parseFeatureOverrides,
  resolveAffiliateAccess,
} from "@/lib/affiliate-access"
import { isAffiliateProgramEnabled } from "@/lib/system-settings"
import {
  normalizeAffiliateCodeInput,
  validateCustomAffiliateCode,
} from "@/lib/affiliate-code"

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  const programEnabled = await isAffiliateProgramEnabled()

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, first_name, last_name, business_name, subscription_tier, feature_overrides, affiliate_code, stripe_connect_account_id, is_admin, is_superadmin, created_at"
    )
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const emailById = new Map<string, string>()
  try {
    let page = 1
    const perPage = 200
    for (let i = 0; i < 20; i++) {
      const { data, error: listError } = await admin.auth.admin.listUsers({
        page,
        perPage,
      })
      if (listError) throw listError
      for (const authUser of data.users) {
        if (authUser.email) emailById.set(authUser.id, authUser.email)
      }
      if (data.users.length < perPage) break
      page += 1
    }
  } catch (listErr) {
    console.error("[admin/affiliates] auth emails:", listErr)
  }

  const userIds = (profiles ?? []).map((p) => p.id)

  const referralStats = new Map<
    string,
    { count: number; totalEarned: number; activeCount: number }
  >()
  if (userIds.length) {
    const { data: referrals } = await admin
      .from("affiliate_referrals")
      .select("affiliate_user_id, status, total_earned")
      .in("affiliate_user_id", userIds)

    for (const row of referrals ?? []) {
      const current = referralStats.get(row.affiliate_user_id) ?? {
        count: 0,
        totalEarned: 0,
        activeCount: 0,
      }
      current.count += 1
      current.totalEarned += Number(row.total_earned || 0)
      if (row.status === "active") current.activeCount += 1
      referralStats.set(row.affiliate_user_id, current)
    }
  }

  const affiliates = (profiles ?? []).map((p) => {
    const email = emailById.get(p.id) ?? null
    const access = resolveAffiliateAccess({
      subscriptionTier: p.subscription_tier,
      featureOverrides: p.feature_overrides,
      programEnabled,
      isSuperadmin: Boolean(p.is_superadmin),
    })
    const commissionRate = getAffiliateCommissionRate(
      p.subscription_tier,
      p.feature_overrides
    )
    const stats = referralStats.get(p.id) ?? {
      count: 0,
      totalEarned: 0,
      activeCount: 0,
    }
    const overrides = parseFeatureOverrides(p.feature_overrides)

    return {
      id: p.id,
      email,
      first_name: p.first_name,
      last_name: p.last_name,
      business_name: p.business_name,
      subscription_tier: p.subscription_tier || "free",
      feature_overrides: overrides,
      affiliate_code: p.affiliate_code?.trim() || null,
      stripe_connect_account_id: p.stripe_connect_account_id || null,
      is_admin: Boolean(p.is_admin),
      is_superadmin: Boolean(p.is_superadmin),
      created_at: p.created_at,
      isEligible: access.isEligible,
      isDisabled: access.isDisabled,
      commissionRate,
      commissionPercentLabel: formatAffiliateCommissionPercent(commissionRate),
      referralCount: stats.count,
      activeReferralCount: stats.activeCount,
      totalEarned: stats.totalEarned,
    }
  })

  return NextResponse.json({ affiliates, programEnabled })
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    userId?: string
    hasAffiliate?: boolean | null
    affiliateCode?: string | null
    commissionPercent?: number | null
  }

  if (!body.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing, error: loadError } = await admin
    .from("profiles")
    .select("id, feature_overrides, affiliate_code")
    .eq("id", body.userId)
    .single()

  if (loadError || !existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const overrides = parseFeatureOverrides(existing.feature_overrides)
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if ("hasAffiliate" in body) {
    if (body.hasAffiliate === null) {
      delete overrides.hasAffiliate
    } else {
      overrides.hasAffiliate = Boolean(body.hasAffiliate)
    }
  }

  if ("commissionPercent" in body) {
    if (body.commissionPercent === null || body.commissionPercent === undefined) {
      delete overrides.affiliateCommissionRate
    } else {
      const pct = Number(body.commissionPercent)
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return NextResponse.json(
          { error: "Commission percent must be between 0 and 100." },
          { status: 400 }
        )
      }
      overrides.affiliateCommissionRate = pct / 100
    }
  }

  updates.feature_overrides = overrides

  if ("affiliateCode" in body) {
    const raw = body.affiliateCode
    if (raw === null || raw === "") {
      updates.affiliate_code = null
    } else {
      const validated = validateCustomAffiliateCode(
        normalizeAffiliateCodeInput(String(raw))
      )
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 })
      }
      updates.affiliate_code = validated.code
    }
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", body.userId)

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That affiliate code is already taken." },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
