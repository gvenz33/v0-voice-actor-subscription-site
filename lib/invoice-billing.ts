import { DEFAULT_WPM } from "@/lib/script-word-count"

export type RateTemplate = "cat1" | "cat2"

export const ADDITIONAL_HALF_HOUR = 148
export const FIRST_HOUR_BILLED_HALF_HOURS = 2

export const BASE_RATES: Record<RateTemplate, number> = {
  cat1: 505,
  cat2: 563,
}

const META_MARKER = "VOBizSuite Invoice Meta:"

export function splitNotesAndMeta(notes: string | null | undefined) {
  const notesStr = notes ?? ""
  const idx = notesStr.indexOf(META_MARKER)
  if (idx === -1) {
    return { userNotes: notesStr.trim(), metaBlock: "" }
  }
  return {
    userNotes: notesStr.slice(0, idx).trim(),
    metaBlock: notesStr.slice(idx).trim(),
  }
}

export function parseInvoiceMeta(notes: string | null | undefined): {
  userNotes: string
  clientEmail: string
  wordCount: number | null
  rateTemplate: RateTemplate
  wpm: number
} {
  const { userNotes, metaBlock } = splitNotesAndMeta(notes)
  const clientEmail = metaBlock.match(/Client email:\s*([^\n\r]+)/i)?.[1]?.trim() || ""

  const wordCount = (() => {
    const m = metaBlock.match(/Word count:\s*(\d+)/i)
    return m ? Number(m[1]) : null
  })()

  const rateTemplateRaw = metaBlock.match(/Rate template:\s*(cat1|cat2)/i)?.[1]
  const rateTemplate = (rateTemplateRaw === "cat2" ? "cat2" : "cat1") as RateTemplate

  const wpmMatch = metaBlock.match(/WPM:\s*(\d+)/i)?.[1]
  const wpm = wpmMatch ? Number(wpmMatch) : DEFAULT_WPM

  return { userNotes, clientEmail, wordCount, rateTemplate, wpm }
}

export function buildInvoiceNotes(params: {
  userNotes: string
  clientEmail: string
  wordCount: number
  rateTemplate: RateTemplate
  wpm: number
}) {
  const { userNotes, clientEmail, wordCount, rateTemplate, wpm } = params

  const metaLines = [
    META_MARKER,
    `Client email: ${clientEmail || ""}`,
    `Word count: ${Math.max(0, Math.floor(wordCount))}`,
    `Rate template: ${rateTemplate}`,
    `WPM: ${Math.max(0, Math.floor(wpm))}`,
  ]

  const metaBlock = metaLines.join("\n")
  if (!userNotes) return metaBlock
  return `${userNotes.trim()}\n\n${metaBlock}`
}

export function computeInvoiceAmount(wordCount: number, wpm: number, rateTemplate: RateTemplate) {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return null
  if (!Number.isFinite(wpm) || wpm <= 0) return null

  const wordsPerHour = wpm * 60
  const durationHours = wordCount / wordsPerHour
  const billedHalfHours = Math.max(FIRST_HOUR_BILLED_HALF_HOURS, Math.ceil(durationHours * 2))
  const additionalHalfHours = Math.max(0, billedHalfHours - FIRST_HOUR_BILLED_HALF_HOURS)
  const amount = BASE_RATES[rateTemplate] + additionalHalfHours * ADDITIONAL_HALF_HOUR

  return {
    amount: Number(amount.toFixed(2)),
    durationHours,
    billedHalfHours,
    additionalHalfHours,
  }
}

export function formatHours(durationHours: number) {
  if (!Number.isFinite(durationHours) || durationHours < 0) return "0h"
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h <= 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}
