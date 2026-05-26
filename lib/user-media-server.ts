import type { SupabaseClient } from "@supabase/supabase-js"
import { USER_MEDIA_BUCKET } from "@/lib/media-storage"
import type { EmailAttachment } from "@/lib/send-email-message"

export type UserMediaRow = {
  id: string
  category: "resume" | "media" | "knowledge_base"
  title: string
  file_name: string
  file_size: number
  mime_type: string | null
  storage_path: string
  created_at: string
}

export async function listUserMediaForAttachments(
  supabase: SupabaseClient,
  userId: string
): Promise<UserMediaRow[]> {
  const { data, error } = await supabase
    .from("user_media")
    .select(
      "id, category, title, file_name, file_size, mime_type, storage_path, created_at"
    )
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

  return (data as UserMediaRow[]) ?? []
}

export async function loadUserMediaAttachments(
  supabase: SupabaseClient,
  userId: string,
  mediaIds: string[]
): Promise<EmailAttachment[]> {
  const uniqueIds = [...new Set(mediaIds.filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const { data: rows, error } = await supabase
    .from("user_media")
    .select("id, file_name, mime_type, storage_path")
    .eq("user_id", userId)
    .in("id", uniqueIds)

  if (error) throw new Error(error.message)
  if (!rows?.length) return []

  const attachments: EmailAttachment[] = []
  for (const row of rows) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(USER_MEDIA_BUCKET)
      .download(row.storage_path)

    if (downloadError || !file) {
      throw new Error(`Could not load "${row.file_name}" for attachment.`)
    }

    attachments.push({
      filename: row.file_name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: row.mime_type || "application/octet-stream",
    })
  }

  return attachments
}
