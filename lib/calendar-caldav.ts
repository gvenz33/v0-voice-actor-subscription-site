import { createDAVClient } from "tsdav"
import type { UnifiedCalendarEvent } from "@/lib/calendar-types"

type CaldavRow = {
  id: string
  display_name: string | null
  caldav_url: string
  caldav_username: string
  caldav_password: string
}

function parseIcsDate(s: string): { date: Date; allDay: boolean } | null {
  const t = s.trim()
  if (/^\d{8}$/.test(t)) {
    const y = Number(t.slice(0, 4))
    const m = Number(t.slice(4, 6)) - 1
    const d = Number(t.slice(6, 8))
    return { date: new Date(Date.UTC(y, m, d)), allDay: true }
  }
  const iso = t.replace(/^(\d{4})(\d{2})(\d{2})T/, "$1-$2-$3T")
  const d = new Date(iso.includes("T") ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return null
  return { date: d, allDay: false }
}

function parseVevents(ics: string): Array<{
  uid: string
  summary: string
  start: Date
  end: Date
  allDay: boolean
}> {
  const out: Array<{
    uid: string
    summary: string
    start: Date
    end: Date
    allDay: boolean
  }> = []
  const blocks = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const uid = block.match(/UID:([^\r\n]+)/)?.[1]?.trim() || `evt-${i}`
    const summary = block.match(/SUMMARY[^:]*:([^\r\n]+)/)?.[1]?.trim() || "(no title)"
    const ds = block.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1]
    const de = block.match(/DTEND[^:]*:([^\r\n]+)/)?.[1]
    if (!ds) continue
    const ps = parseIcsDate(ds)
    const pe = de ? parseIcsDate(de) : null
    if (!ps) continue
    const start = ps.date
    const end = pe?.date ?? new Date(ps.date.getTime() + 60 * 60 * 1000)
    const allDay = ps.allDay && (!pe || pe.allDay)
    out.push({ uid, summary, start, end, allDay })
  }
  return out
}

export async function fetchCaldavEvents(
  row: CaldavRow,
  timeMin: string,
  timeMax: string
): Promise<UnifiedCalendarEvent[]> {
  const client = await createDAVClient({
    serverUrl: row.caldav_url,
    credentials: {
      username: row.caldav_username,
      password: row.caldav_password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  })

  const account = await client.createAccount({
    account: {
      accountType: "caldav",
      serverUrl: row.caldav_url,
      credentials: {
        username: row.caldav_username,
        password: row.caldav_password,
      },
    },
    loadCollections: true,
  })

  const calendars = account.calendars ?? []
  const label = row.display_name || "CalDAV"
  const merged: UnifiedCalendarEvent[] = []

  for (const cal of calendars) {
    const objects = await client.fetchCalendarObjects({
      calendar: cal,
      timeRange: { start: timeMin, end: timeMax },
      expand: true,
    })
    for (const obj of objects) {
      const raw =
        typeof obj.data === "string" ? obj.data : String(obj.data ?? "")
      if (!raw) continue
      for (const ev of parseVevents(raw)) {
        merged.push({
          id: `caldav:${row.id}:${obj.url}:${ev.uid}`,
          title: ev.summary,
          start: ev.start.toISOString(),
          end: ev.end.toISOString(),
          allDay: ev.allDay,
          provider: "caldav",
          sourceLabel: label,
        })
      }
    }
  }

  return merged
}
