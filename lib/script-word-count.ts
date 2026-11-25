/** Default words-per-minute for reading-time estimates (matches Billing Desk). */
export const DEFAULT_WPM = 150

/** Session key used to pass word count from Script counter → Billing Desk. */
export const BILLING_WORD_COUNT_SESSION_KEY = "vobiz_billing_word_count"

/**
 * Query param Billing Desk reads to open a draft created from the script counter.
 * Other billing links (including `wordCount`) do not use this.
 */
export const BILLING_DRAFT_INVOICE_QUERY_PARAM = "invoice"

export function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

export function readingMinutes(wordCount: number, wpm: number = DEFAULT_WPM): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0 || !Number.isFinite(wpm) || wpm <= 0) {
    return 0
  }
  return Math.ceil(wordCount / wpm)
}
