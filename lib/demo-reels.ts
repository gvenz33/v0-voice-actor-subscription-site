export const DEMO_REELS_BUCKET = "demo-reels"

export const MAX_DEMO_REELS_PER_USER = 10

export const MAX_DEMO_REEL_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export const ALLOWED_DEMO_REEL_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "video/mp4",
])

export const DEMO_REEL_ACCEPT =
  "audio/*,video/mp4,.mp3,.wav,.m4a,.aac,.ogg,.mp4"

export function formatDemoReelFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function sanitizeDemoReelFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return base.slice(0, 120) || "demo-reel"
}

export function isAllowedDemoReelFile(file: File): boolean {
  if (file.size > MAX_DEMO_REEL_FILE_SIZE_BYTES) return false
  if (ALLOWED_DEMO_REEL_MIME_TYPES.has(file.type)) return true
  const ext = file.name.split(".").pop()?.toLowerCase()
  return ext === "mp3" || ext === "wav" || ext === "m4a" || ext === "aac" || ext === "ogg" || ext === "mp4"
}

export function buildDemoReelStoragePath(userId: string, fileName: string): string {
  const safeName = sanitizeDemoReelFileName(fileName)
  return `${userId}/${crypto.randomUUID()}-${safeName}`
}

export function demoReelTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "")
  return withoutExt.replace(/[_-]+/g, " ").trim() || "Demo Reel"
}
