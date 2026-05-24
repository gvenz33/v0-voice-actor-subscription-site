export type MailFolder = "inbox" | "sent"

export type NormalizedThread = {
  id: string
  threadKey: string
  accountId: string
  provider: "gmail" | "outlook" | "smtp"
  folder: MailFolder
  subject: string
  from: string
  to: string
  snippet: string
  internalDate: number
}
