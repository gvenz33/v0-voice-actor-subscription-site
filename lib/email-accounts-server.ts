import type { SupabaseClient } from "@supabase/supabase-js"
import type { EmailAccountRow } from "@/lib/email-account-types"

export async function getEmailAccountForSend(
  supabase: SupabaseClient,
  userId: string,
  accountId?: string | null
): Promise<{ data: EmailAccountRow | null; error: { code?: string; message: string } | null }> {
  if (accountId) {
    const { data, error } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("id", accountId)
      .maybeSingle()
    if (error) {
      return { data: null, error: { code: error.code, message: error.message } }
    }
    return { data: data as EmailAccountRow | null, error: null }
  }

  const { data: defaultRow, error: defErr } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default_for_send", true)
    .maybeSingle()

  if (defErr) {
    return { data: null, error: { code: defErr.code, message: defErr.message } }
  }
  if (defaultRow) {
    return { data: defaultRow as EmailAccountRow, error: null }
  }

  const { data: anyRow, error: anyErr } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (anyErr) {
    return { data: null, error: { code: anyErr.code, message: anyErr.message } }
  }
  return { data: anyRow as EmailAccountRow | null, error: null }
}

export async function listEmailAccounts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: EmailAccountRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }
  return { data: (data ?? []) as EmailAccountRow[], error: null }
}
