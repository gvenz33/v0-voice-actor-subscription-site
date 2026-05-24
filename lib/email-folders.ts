export type MailFolder =
  | "inbox"
  | "sent"
  | "outbox"
  | "drafts"
  | "trash"
  | "spam"

export const MAIL_FOLDERS: { id: MailFolder; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "sent", label: "Sent" },
  { id: "outbox", label: "Outbox" },
  { id: "drafts", label: "Drafts" },
  { id: "trash", label: "Trash" },
  { id: "spam", label: "Spam" },
]

const VALID_FOLDERS = new Set<string>(MAIL_FOLDERS.map((f) => f.id))

export function parseMailFolder(value: string | null | undefined): MailFolder {
  if (value && VALID_FOLDERS.has(value)) return value as MailFolder
  return "inbox"
}

export function folderLabel(folder: MailFolder): string {
  return MAIL_FOLDERS.find((f) => f.id === folder)?.label ?? "Inbox"
}

export const GMAIL_FOLDER_QUERY: Record<MailFolder, string> = {
  inbox: "in:inbox",
  sent: "in:sent",
  outbox: "in:drafts",
  drafts: "in:drafts",
  trash: "in:trash",
  spam: "in:spam",
}

export const OUTLOOK_FOLDER_SEGMENT: Record<MailFolder, string> = {
  inbox: "inbox",
  sent: "sentitems",
  outbox: "outbox",
  drafts: "drafts",
  trash: "deleteditems",
  spam: "junkemail",
}

export const IMAP_FOLDER_CANDIDATES: Record<MailFolder, string[]> = {
  inbox: ["INBOX"],
  sent: ["Sent", "Sent Items", "Sent Mail", "[Gmail]/Sent Mail", "INBOX.Sent"],
  outbox: ["Outbox", "Out Box", "OUTBOX"],
  drafts: ["Drafts", "Draft", "[Gmail]/Drafts", "INBOX.Drafts"],
  trash: ["Trash", "Deleted", "Deleted Items", "[Gmail]/Trash", "INBOX.Trash"],
  spam: ["Spam", "Junk", "Junk E-mail", "[Gmail]/Spam", "INBOX.Junk"],
}
