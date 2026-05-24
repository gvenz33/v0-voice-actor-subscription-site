import type { MailFolder } from "@/lib/email-folders"

export type { MailFolder }
export { MAIL_FOLDERS, folderLabel, parseMailFolder } from "@/lib/email-folders"

export type NormalizedThread = {
  id: string
  threadKey: string
  messageId?: string
  accountId: string
  provider: "gmail" | "outlook" | "smtp"
  folder: MailFolder
  subject: string
  from: string
  to: string
  snippet: string
  internalDate: number
}
