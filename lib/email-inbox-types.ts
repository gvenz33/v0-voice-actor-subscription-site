export type NormalizedThread = {
  id: string
  threadKey: string
  accountId: string
  provider: "gmail" | "outlook" | "smtp"
  subject: string
  from: string
  snippet: string
  internalDate: number
}
