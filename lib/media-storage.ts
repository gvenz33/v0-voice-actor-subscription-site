import type { SubscriptionTier } from "@/lib/subscription-tier"
import { normalizeSubscriptionTier } from "@/lib/subscription-tier"

/** Supabase storage COGS (~$0.021/GB/mo). Bundled at ~12× for margin inside subscription. */
export const STORAGE_PROVIDER_COST_PER_GB_MONTH = 0.021
export const STORAGE_BUNDLED_MARGIN_MULTIPLIER = 12

export const USER_MEDIA_BUCKET = "user-media"

export type MediaCategory = "resume" | "media"

/** Total storage included per tier (demo reels + resume + media repository). */
export const TIER_STORAGE_LIMIT_BYTES: Record<SubscriptionTier, number> = {
  free: 50 * 1024 * 1024,
  launch: 500 * 1024 * 1024,
  momentum: 2 * 1024 * 1024 * 1024,
  command: 10 * 1024 * 1024 * 1024,
}

export const TIER_STORAGE_LABEL: Record<SubscriptionTier, string> = {
  free: "50 MB",
  launch: "500 MB",
  momentum: "2 GB",
  command: "10 GB",
}

export const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024

const MEDIA_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "video/mp4",
  "video/quicktime",
])

export const RESUME_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"

export const MEDIA_REPOSITORY_ACCEPT =
  ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.mp4,.mov,audio/*,image/*,video/mp4,video/quicktime"

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function getStorageLimitBytes(tierRaw: string | null | undefined): number {
  return TIER_STORAGE_LIMIT_BYTES[normalizeSubscriptionTier(tierRaw)]
}

export function getStorageLimitLabel(tierRaw: string | null | undefined): string {
  return TIER_STORAGE_LABEL[normalizeSubscriptionTier(tierRaw)]
}

export function maxUploadFileBytesForTier(tierRaw: string | null | undefined): number {
  const tier = normalizeSubscriptionTier(tierRaw)
  switch (tier) {
    case "command":
      return 100 * 1024 * 1024
    case "momentum":
      return 50 * 1024 * 1024
    case "launch":
      return 25 * 1024 * 1024
    default:
      return 10 * 1024 * 1024
  }
}

/** Estimated wholesale storage cost for the tier allocation (for admin transparency). */
export function estimatedStorageCostPerMonth(tierRaw: string | null | undefined): number {
  const gb = getStorageLimitBytes(tierRaw) / (1024 * 1024 * 1024)
  return gb * STORAGE_PROVIDER_COST_PER_GB_MONTH
}

/** Retail-equivalent storage value bundled in plan (margin target). */
export function bundledStorageValuePerMonth(tierRaw: string | null | undefined): number {
  return estimatedStorageCostPerMonth(tierRaw) * STORAGE_BUNDLED_MARGIN_MULTIPLIER
}

export function sanitizeMediaFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return base.slice(0, 120) || "file"
}

export function buildUserMediaStoragePath(
  userId: string,
  category: MediaCategory,
  fileName: string
): string {
  const safeName = sanitizeMediaFileName(fileName)
  return `${userId}/${category}/${crypto.randomUUID()}-${safeName}`
}

export function isAllowedResumeFile(file: File): boolean {
  if (file.size > MAX_RESUME_FILE_BYTES) return false
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "pdf" || ext === "doc" || ext === "docx" || ext === "txt") return true
  return (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type.includes("wordprocessingml") ||
    file.type === "text/plain"
  )
}

export function isAllowedMediaRepositoryFile(
  file: File,
  tierRaw: string | null | undefined
): boolean {
  if (file.size > maxUploadFileBytesForTier(tierRaw)) return false
  if (MEDIA_MIME_TYPES.has(file.type)) return true
  const ext = file.name.split(".").pop()?.toLowerCase()
  return (
    ext === "pdf" ||
    ext === "doc" ||
    ext === "docx" ||
    ext === "txt" ||
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "png" ||
    ext === "webp" ||
    ext === "gif" ||
    ext === "mp3" ||
    ext === "wav" ||
    ext === "m4a" ||
    ext === "mp4" ||
    ext === "mov"
  )
}

export function mediaTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "")
  return withoutExt.replace(/[_-]+/g, " ").trim() || "Media file"
}

export function storageQuotaError(neededBytes: number, remainingBytes: number): string {
  return `Not enough storage. This file needs ${formatStorageBytes(neededBytes)} but you only have ${formatStorageBytes(Math.max(0, remainingBytes))} left. Upgrade your plan or delete files to free space.`
}
