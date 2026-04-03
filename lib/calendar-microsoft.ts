import type { SupabaseClient } from "@supabase/supabase-js"
import type { EmailAccountRow } from "@/lib/email-account-types"
import { ensureMicrosoftAccessToken } from "@/lib/email-tokens"
import type { UnifiedCalendarEvent } from "@/lib/calendar-types"

export async function fetchMicrosoftCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  row: EmailAccountRow,
  timeMin: string,
  timeMax: string
): Promise<UnifiedCalendarEvent[]> {
  const accessToken = await ensureMicrosoftAccessToken(supabase, userId, row)
  const url = new URL(
    "https://graph.microsoft.com/v1.0/me/calendar/calendarView"
  )
  url.searchParams.set("startDateTime", timeMin)
  url.searchParams.set("endDateTime", timeMax)
  url.searchParams.set("$top", "250")

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || "Microsoft Calendar failed")
  }
  const json = (await res.json()) as {
    value?: {
      id: string
      subject?: string
      isAllDay?: boolean
      start?: { dateTime?: string; timeZone?: string }
      end?: { dateTime?: string; timeZone?: string }
    }[]
  }
  const label = row.oauth_email || "Microsoft 365"
  const out: UnifiedCalendarEvent[] = []
  for (const it of json.value ?? []) {
    const start = it.start?.dateTime
    const end = it.end?.dateTime
    if (!start || !end) continue
    out.push({
      id: `msft:${row.id}:${it.id}`,
      title: it.subject || "(no title)",
      start,
      end,
      allDay: !!it.isAllDay,
      provider: "microsoft",
      sourceLabel: label,
    })
  }
  return out
}
