export type EmailMessageContent = {
  subject: string
  from: string
  to: string
  cc: string
  text: string
  html: string
  messageId?: string
  gmailMessageId?: string
  gmailThreadId?: string
}

export type ComposeMode = "new" | "reply" | "replyAll" | "forward"
