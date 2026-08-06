export const BETA_FEEDBACK_BUCKET = "beta-feedback"

export const MAX_BETA_FEEDBACK_SCREENSHOTS = 5

export const MAX_BETA_FEEDBACK_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_BETA_FEEDBACK_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
])

export const BETA_FEEDBACK_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"

export type BetaFeedbackAttachment = {
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number
}

export function sanitizeBetaFeedbackFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return base.slice(0, 120) || "screenshot"
}

export function isAllowedBetaFeedbackScreenshot(file: File): boolean {
  if (file.size > MAX_BETA_FEEDBACK_FILE_SIZE_BYTES) return false
  if (ALLOWED_BETA_FEEDBACK_MIME_TYPES.has(file.type)) return true
  const ext = file.name.split(".").pop()?.toLowerCase()
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" || ext === "gif"
}

export function buildBetaFeedbackStoragePath(userId: string, fileName: string): string {
  const safeName = sanitizeBetaFeedbackFileName(fileName)
  return `${userId}/${crypto.randomUUID()}-${safeName}`
}

export function formatBetaFeedbackFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
