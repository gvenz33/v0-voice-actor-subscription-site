import type { SupabaseClient } from "@supabase/supabase-js"

export async function loadKnowledgeBaseContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("user_knowledge_base")
    .select("title, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6)

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("schema cache")
    ) {
      return ""
    }
    throw new Error(error.message)
  }
  const rows =
    (data as Array<{ title: string; content: string; created_at: string }>) ?? []
  if (rows.length === 0) return ""

  return rows
    .map((row, idx) => {
      const clipped = row.content.trim().slice(0, 1200)
      return `${idx + 1}. ${row.title}\n${clipped}`
    })
    .join("\n\n")
}
