"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmailHtmlBody } from "@/components/inbox/email-html-body"
import {
  buildQuotedText,
  buildReplyAllRecipients,
  buildReplyRecipients,
  formatForwardSubject,
  formatReplySubject,
} from "@/lib/email-address"
import type { ComposeMode, EmailMessageContent } from "@/lib/email-message-types"
import type { MailFolder, NormalizedThread } from "@/lib/email-inbox-types"
import {
  Forward,
  Loader2,
  Mail,
  Paperclip,
  Reply,
  ReplyAll,
  Send,
  Trash2,
  X,
} from "lucide-react"

type AccountOpt = {
  id: string
  provider: string | null
  oauth_email: string | null
  smtp_from_email: string | null
  is_default_for_send?: boolean | null
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load")
  return res.json()
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ownEmailsForAccount(accounts: AccountOpt[], accountId: string): string[] {
  const acc = accounts.find((a) => a.id === accountId)
  return [acc?.oauth_email, acc?.smtp_from_email].filter(Boolean) as string[]
}

function composeTitle(mode: ComposeMode): string {
  switch (mode) {
    case "reply":
      return "Reply"
    case "replyAll":
      return "Reply all"
    case "forward":
      return "Forward"
    default:
      return "Compose"
  }
}

export default function InboxPage() {
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [mailFolder, setMailFolder] = useState<MailFolder>("inbox")
  const [selected, setSelected] = useState<NormalizedThread | null>(null)
  const [messageContent, setMessageContent] = useState<EmailMessageContent | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const { data: accData } = useSWR("/api/email/accounts", fetcher)
  const accounts: AccountOpt[] = accData?.accounts ?? []

  const threadsUrl = `/api/email/threads?accountId=${encodeURIComponent(accountFilter)}&folder=${mailFolder}`
  const { data: threadData, isLoading, error, mutate } = useSWR(threadsUrl, fetcher)

  const threads: NormalizedThread[] = threadData?.threads ?? []
  const threadErrors: string[] = threadData?.errors ?? []

  useEffect(() => {
    setSelected(null)
    setMessageContent(null)
  }, [accountFilter, mailFolder])

  useEffect(() => {
    if (!selected) {
      setMessageContent(null)
      return
    }
    let cancelled = false
    setBodyLoading(true)
    const params = new URLSearchParams({ accountId: selected.accountId })
    if (selected.provider === "gmail") {
      params.set("gmailThreadId", selected.threadKey)
    } else if (selected.provider === "outlook") {
      params.set("outlookMessageId", selected.threadKey)
    } else {
      params.set("imapUid", selected.threadKey)
    }
    if (selected.folder === "sent" || mailFolder === "sent") {
      params.set("folder", "sent")
    }
    fetch(`/api/email/content?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setMessageContent({
            subject: selected.subject,
            from: selected.from,
            to: selected.to,
            cc: "",
            text: data.error,
            html: "",
          })
        } else {
          setMessageContent(data as EmailMessageContent)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessageContent({
            subject: selected.subject,
            from: selected.from,
            to: selected.to,
            cc: "",
            text: "Failed to load message.",
            html: "",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setBodyLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, mailFolder])

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>("new")
  const [sendTo, setSendTo] = useState("")
  const [sendCc, setSendCc] = useState("")
  const [sendSubject, setSendSubject] = useState("")
  const [sendBody, setSendBody] = useState("")
  const [sendAttachments, setSendAttachments] = useState<File[]>([])
  const [sendAccountId, setSendAccountId] = useState<string>("")
  const [sendLoading, setSendLoading] = useState(false)

  const defaultSendId = useMemo(() => {
    const d = accounts.find((a) => a.is_default_for_send)
    return d?.id ?? accounts[0]?.id ?? ""
  }, [accounts])

  useEffect(() => {
    if (defaultSendId && !sendAccountId) {
      setSendAccountId(defaultSendId)
    }
  }, [defaultSendId, sendAccountId])

  const resetCompose = () => {
    setComposeOpen(false)
    setComposeMode("new")
    setSendTo("")
    setSendCc("")
    setSendSubject("")
    setSendBody("")
    setSendAttachments([])
  }

  const openCompose = useCallback(
    (mode: ComposeMode = "new") => {
      setComposeMode(mode)
      setSendAttachments([])
      if (mode === "new") {
        setSendTo("")
        setSendCc("")
        setSendSubject("")
        setSendBody("")
        if (defaultSendId) setSendAccountId(defaultSendId)
      }
      setComposeOpen(true)
    },
    [defaultSendId]
  )

  const startReply = (mode: "reply" | "replyAll" | "forward") => {
    if (!selected || !messageContent) return
    setSendAccountId(selected.accountId)
    setComposeMode(mode)
    const own = ownEmailsForAccount(accounts, selected.accountId)

    if (mode === "forward") {
      setSendTo("")
      setSendCc("")
      setSendSubject(formatForwardSubject(messageContent.subject))
      setSendBody(buildQuotedText(messageContent))
    } else if (mode === "replyAll") {
      const { to, cc } = buildReplyAllRecipients({
        from: messageContent.from,
        to: messageContent.to,
        cc: messageContent.cc,
        ownEmails: own,
      })
      setSendTo(to)
      setSendCc(cc)
      setSendSubject(formatReplySubject(messageContent.subject))
      setSendBody(`\n\n${buildQuotedText(messageContent)}`)
    } else {
      setSendTo(buildReplyRecipients({ from: messageContent.from, ownEmails: own }))
      setSendCc("")
      setSendSubject(formatReplySubject(messageContent.subject))
      setSendBody(`\n\n${buildQuotedText(messageContent)}`)
    }
    setSendAttachments([])
    setComposeOpen(true)
  }

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setSendAttachments((prev) => [...prev, ...files])
    e.target.value = ""
  }

  const removeAttachment = (index: number) => {
    setSendAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!sendTo.trim() || !sendSubject.trim() || !sendBody.trim()) return
    setSendLoading(true)
    try {
      const attachments = await Promise.all(
        sendAttachments.map(async (file) => ({
          filename: file.name,
          contentBase64: await readFileAsBase64(file),
          contentType: file.type || "application/octet-stream",
        }))
      )

      const isReply = composeMode === "reply" || composeMode === "replyAll"
      const payload: Record<string, unknown> = {
        to: sendTo.trim(),
        cc: sendCc.trim() || undefined,
        subject: sendSubject.trim(),
        body: sendBody,
        account_id: sendAccountId || undefined,
        attachments,
      }

      if (isReply && messageContent?.messageId) {
        payload.in_reply_to = messageContent.messageId
        payload.references = messageContent.messageId
      }
      if (isReply && messageContent?.gmailThreadId) {
        payload.gmail_thread_id = messageContent.gmailThreadId
      }

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Send failed")
      resetCompose()
      setMailFolder("sent")
      mutate()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Send failed")
    }
    setSendLoading(false)
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm("Move this message to trash?")) return
    setDeleteLoading(true)
    try {
      const payload: Record<string, unknown> = {
        accountId: selected.accountId,
        provider: selected.provider,
        folder: selected.folder || mailFolder,
      }
      if (selected.provider === "gmail") {
        payload.gmailThreadId = selected.threadKey
      } else if (selected.provider === "outlook") {
        payload.outlookMessageId = selected.threadKey
      } else {
        payload.imapUid = selected.threadKey
      }
      const res = await fetch("/api/email/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      setSelected(null)
      setMessageContent(null)
      mutate()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed")
    }
    setDeleteLoading(false)
  }

  const emptyMessage =
    mailFolder === "sent"
      ? "No sent messages yet."
      : "No messages yet. Connect Gmail, Outlook, or SMTP+IMAP in Settings."

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Mail className="size-6" />
          Mail
        </h2>
        <p className="text-sm text-muted-foreground">
          Read, reply, forward, and manage email across connected accounts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            type="button"
            variant={mailFolder === "inbox" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMailFolder("inbox")}
          >
            Inbox
          </Button>
          <Button
            type="button"
            variant={mailFolder === "sent" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMailFolder("sent")}
          >
            Sent
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Account</Label>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {(a.provider === "gmail"
                    ? "Gmail"
                    : a.provider === "outlook"
                      ? "Outlook"
                      : "SMTP") +
                    " — " +
                    (a.oauth_email || a.smtp_from_email || a.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => mutate()}>
          Refresh
        </Button>
        <Button onClick={() => openCompose("new")}>
          <Send className="mr-2 size-4" />
          Compose
        </Button>
      </div>

      {threadErrors.length > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Some accounts could not load: {threadErrors.join("; ")}
        </p>
      )}

      {composeOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">{composeTitle(composeMode)}</CardTitle>
            <Button type="button" variant="ghost" size="icon" onClick={resetCompose}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>From account</Label>
                <Select value={sendAccountId} onValueChange={setSendAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.oauth_email || a.smtp_from_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cc">Cc</Label>
              <Input
                id="cc"
                value={sendCc}
                onChange={(e) => setSendCc(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subj">Subject</Label>
              <Input
                id="subj"
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="msg">Message</Label>
              <Textarea
                id="msg"
                rows={8}
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Attachments</Label>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => attachmentInputRef.current?.click()}
              >
                <Paperclip className="mr-2 size-4" />
                Add attachment
              </Button>
              {sendAttachments.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {sendAttachments.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSend} disabled={sendLoading}>
                {sendLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-2 size-4" /> Send
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetCompose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-[480px]">
          <CardHeader>
            <CardTitle className="text-base">
              {mailFolder === "sent" ? "Sent" : "Inbox"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <p className="p-4 text-sm text-destructive">
                Could not load {mailFolder === "sent" ? "sent mail" : "inbox"}.
              </p>
            )}
            {!isLoading && !error && threads.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{emptyMessage}</p>
            )}
            <ScrollArea className="h-[400px]">
              <ul className="divide-y divide-border">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors ${
                        selected?.id === t.id ? "bg-muted/40" : ""
                      }`}
                    >
                      <div className="font-medium line-clamp-1">{t.subject}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {mailFolder === "sent"
                          ? t.to
                            ? `To: ${t.to}`
                            : "To: (unknown)"
                          : t.from}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {t.snippet}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-[480px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Message</CardTitle>
            {selected && (
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startReply("reply")}
                  disabled={!messageContent}
                >
                  <Reply className="mr-1 size-3.5" />
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startReply("replyAll")}
                  disabled={!messageContent}
                >
                  <ReplyAll className="mr-1 size-3.5" />
                  Reply all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startReply("forward")}
                  disabled={!messageContent}
                >
                  <Forward className="mr-1 size-3.5" />
                  Forward
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="text-destructive hover:text-destructive"
                >
                  {deleteLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="mr-1 size-3.5" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected && (
              <p className="text-sm text-muted-foreground">
                Select a message to read it.
              </p>
            )}
            {selected && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-medium">{selected.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mailFolder === "sent"
                      ? selected.to
                        ? `To: ${selected.to}`
                        : "To: (unknown)"
                      : `From: ${selected.from}`}
                  </p>
                  {messageContent?.cc && (
                    <p className="text-xs text-muted-foreground">Cc: {messageContent.cc}</p>
                  )}
                </div>
                {bodyLoading ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground mt-4" />
                ) : messageContent?.html ? (
                  <EmailHtmlBody html={messageContent.html} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm rounded border border-border p-3 bg-muted/20 max-h-[420px] overflow-auto">
                    {messageContent?.text || ""}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
