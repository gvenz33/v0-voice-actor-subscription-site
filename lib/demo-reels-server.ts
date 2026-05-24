import type { SupabaseClient } from "@supabase/supabase-js"
import { DEMO_REELS_BUCKET } from "@/lib/demo-reels"
import type { EmailAttachment } from "@/lib/send-email-message"

export type DemoReelRow = {
  id: string
  title: string
  file_name: string
  file_size: number
  mime_type: string | null
  storage_path: string
  created_at: string
}

export async function listUserDemoReels(
  supabase: SupabaseClient,
  userId: string
): Promise<DemoReelRow[]> {
  const { data, error } = await supabase
    .from("demo_reels")
    .select("id, title, file_name, file_size, mime_type, storage_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("schema cache")
    ) {
      return []
    }
    throw new Error(error.message)
  }

  return (data as DemoReelRow[]) ?? []
}

export async function loadDemoReelAttachments(
  supabase: SupabaseClient,
  userId: string,
  reelIds: string[]
): Promise<EmailAttachment[]> {
  const uniqueIds = [...new Set(reelIds.filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const { data: rows, error } = await supabase
    .from("demo_reels")
    .select("id, file_name, mime_type, storage_path")
    .eq("user_id", userId)
    .in("id", uniqueIds)

  if (error) throw new Error(error.message)
  if (!rows?.length) return []

  const attachments: EmailAttachment[] = []

  for (const row of rows) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(DEMO_REELS_BUCKET)
      .download(row.storage_path)

    if (downloadError || !file) {
      throw new Error(`Could not load demo reel "${row.file_name}" for attachment.`)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    attachments.push({
      filename: row.file_name,
      content: buffer,
      contentType: row.mime_type || "application/octet-stream",
    })
  }

  return attachments
}
