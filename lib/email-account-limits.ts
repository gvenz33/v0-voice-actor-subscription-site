import type { SupabaseClient } from "@supabase/supabase-js"

/** Max connected mailboxes per user (Gmail + Outlook + SMTP combined). */
export const MAX_EMAIL_ACCOUNTS_PER_USER = 8

export async function countEmailAccountsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("email_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    console.error("countEmailAccountsForUser:", error)
    return 0
  }
  return count ?? 0
}
