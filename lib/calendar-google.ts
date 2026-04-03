import type { SupabaseClient } from "@supabase/supabase-js"
import type { EmailAccountRow } from "@/lib/email-account-types"
import { ensureGoogleAccessToken } from "@/lib/email-tokens"
import type { UnifiedCalendarEvent } from "@/lib/calendar-types"

export async function fetchGoogleCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  timeMin: string,
  timeMax: string
): Promise<UnifiedCalendarEvent[]> {
  const accessToken = await ensureGoogleAccessToken(supabase, userId, row)
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || "Google Calendar failed")
  }
  const json = (await res.json()) as {
    items?: {
      id: string
      summary?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }[]
  }
  const label = row.oauth_email || "Google"
  const out: UnifiedCalendarEvent[] = []
  for (const it of json.items ?? []) {
    const allDay = !!(it.start?.date && !it.start?.dateTime)
    const start = it.start?.dateTime || it.start?.date
    const end = it.end?.dateTime || it.end?.date
    if (!start || !end) continue
    out.push({
      id: `gcal:${row.id}:${it.id}`,
      title: it.summary || "(no title)",
      start: allDay ? `${start}T00:00:00.000Z` : start,
      end: allDay ? `${end}T23:59:59.999Z` : end,
      allDay,
      provider: "google",
      sourceLabel: label,
    })
  }
  return out
}
