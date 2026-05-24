import type { SupabaseClient } from "@supabase/supabase-js"

export async function getUserEmailSignature(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("email_signatures")
    .select("signature_text")
    .eq("user_id", userId)
    .maybeSingle()

  return (data?.signature_text ?? "").trim()
}

export function appendSignatureToPlainText(body: string, signature: string) {
  const trimmed = signature.trim()
  if (!trimmed) return body
  return `${body.trim()}\n\n${trimmed}`
}

export function appendSignatureToHtml(bodyHtml: string, signature: string) {
  const trimmed = signature.trim()
  if (!trimmed) return bodyHtml
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />")
  return `${bodyHtml}<br /><br /><div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e5e5;color:#333;">${escaped}</div>`
}
