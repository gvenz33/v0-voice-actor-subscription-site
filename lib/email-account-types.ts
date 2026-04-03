export type EmailProvider = "gmail" | "outlook" | "smtp"

export type EmailAccountRow = {
  id: string
  user_id: string
  provider: EmailProvider | string | null
  label: string | null
  oauth_access_token: string | null
  oauth_refresh_token: string | null
  oauth_expires_at: string | null
  oauth_email: string | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_use_tls: boolean | null
  imap_host: string | null
  imap_port: number | null
  imap_username: string | null
  imap_password: string | null
  imap_use_tls: boolean | null
  bcc_self: boolean | null
  signature_text: string | null
  is_default_for_send: boolean | null
  created_at: string | null
  updated_at: string | null
}
