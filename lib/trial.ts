export const FREE_TRIAL_DAYS = 14

export type TrialProfileFields = {
  subscription_tier?: string | null
  trial_started_at?: string | null
  trial_ends_at?: string | null
  trial_expired_notified_at?: string | null
  trial_exempt?: boolean | null
  is_admin?: boolean | null
  is_superadmin?: boolean | null
}

export type TrialStatus = {
  isFreeTier: boolean
  isExempt: boolean
  isActive: boolean
  isExpired: boolean
  endsAt: Date | null
  daysRemaining: number | null
}

export function addTrialDays(from: Date, days = FREE_TRIAL_DAYS): Date {
  const end = new Date(from.getTime())
  end.setUTCDate(end.getUTCDate() + days)
  return end
}

export function getTrialStatus(
  profile: TrialProfileFields | null | undefined,
  now = new Date(),
): TrialStatus {
  const tier = (profile?.subscription_tier || "free").toLowerCase()
  const isFreeTier = tier === "free"
  const isExempt = Boolean(
    profile?.trial_exempt ||
      profile?.is_admin ||
      profile?.is_superadmin ||
      !isFreeTier,
  )

  if (!isFreeTier || isExempt) {
    return {
      isFreeTier,
      isExempt: true,
      isActive: false,
      isExpired: false,
      endsAt: null,
      daysRemaining: null,
    }
  }

  const endsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  if (!endsAt || Number.isNaN(endsAt.getTime())) {
    // Missing trial dates — treat as needing assignment, not yet expired.
    return {
      isFreeTier: true,
      isExempt: false,
      isActive: true,
      isExpired: false,
      endsAt: null,
      daysRemaining: FREE_TRIAL_DAYS,
    }
  }

  const msLeft = endsAt.getTime() - now.getTime()
  const isExpired = msLeft <= 0
  const daysRemaining = isExpired ? 0 : Math.ceil(msLeft / (1000 * 60 * 60 * 24))

  return {
    isFreeTier: true,
    isExempt: false,
    isActive: !isExpired,
    isExpired,
    endsAt,
    daysRemaining,
  }
}

/** Dashboard routes still allowed after trial expiry (upgrade / account). */
export function isTrialExpiredAllowlistedPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/billing" ||
    pathname.startsWith("/dashboard/billing/") ||
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/settings/")
  )
}
