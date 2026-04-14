/**
 * Inbox for support escalations and the public contact form.
 * Override with NOTIFY_INBOX_EMAIL in env (e.g. staging).
 */
export function getNotifyInboxEmail(): string {
  return process.env.NOTIFY_INBOX_EMAIL?.trim() || "hello@vobizsuite.io"
}
