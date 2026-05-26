import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getStorageLimitBytes,
  getStorageLimitLabel,
  bundledStorageValuePerMonth,
  estimatedStorageCostPerMonth,
  formatStorageBytes,
} from "@/lib/media-storage"
import { normalizeSubscriptionTier } from "@/lib/subscription-tier"

export type StorageUsageSnapshot = {
  usedBytes: number
  limitBytes: number
  remainingBytes: number
  usedLabel: string
  limitLabel: string
  percentUsed: number
  tier: ReturnType<typeof normalizeSubscriptionTier>
  estimatedProviderCostMonthly: number
  bundledValueMonthly: number
}

export async function sumUserStorageBytes(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  let total = 0

  const { data: reels, error: reelsError } = await supabase
    .from("demo_reels")
    .select("file_size")
    .eq("user_id", userId)

  if (!reelsError && reels) {
    total += reels.reduce((sum, row) => sum + Number(row.file_size || 0), 0)
  }

  const { data: media, error: mediaError } = await supabase
    .from("user_media")
    .select("file_size")
    .eq("user_id", userId)

  if (!mediaError && media) {
    total += media.reduce((sum, row) => sum + Number(row.file_size || 0), 0)
  }

  return total
}

export async function getStorageUsageSnapshot(
  supabase: SupabaseClient,
  userId: string,
  subscriptionTier: string | null | undefined
): Promise<StorageUsageSnapshot> {
  const tier = normalizeSubscriptionTier(subscriptionTier)
  const usedBytes = await sumUserStorageBytes(supabase, userId)
  const limitBytes = getStorageLimitBytes(subscriptionTier)
  const remainingBytes = Math.max(0, limitBytes - usedBytes)

  return {
    usedBytes,
    limitBytes,
    remainingBytes,
    usedLabel: formatStorageBytes(usedBytes),
    limitLabel: getStorageLimitLabel(subscriptionTier),
    percentUsed: limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 100,
    tier,
    estimatedProviderCostMonthly: estimatedStorageCostPerMonth(subscriptionTier),
    bundledValueMonthly: bundledStorageValuePerMonth(subscriptionTier),
  }
}

export async function assertStorageQuota(
  supabase: SupabaseClient,
  userId: string,
  subscriptionTier: string | null | undefined,
  additionalBytes: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const snapshot = await getStorageUsageSnapshot(
    supabase,
    userId,
    subscriptionTier
  )
  if (additionalBytes > snapshot.remainingBytes) {
    return {
      ok: false,
      message: `Not enough storage. You have ${snapshot.usedLabel} of ${snapshot.limitLabel} used. Upgrade your plan or delete files.`,
    }
  }
  return { ok: true }
}
