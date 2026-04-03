import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listEmailAccounts } from "@/lib/email-accounts-server"
import { fetchGoogleCalendarEvents } from "@/lib/calendar-google"
import { fetchMicrosoftCalendarEvents } from "@/lib/calendar-microsoft"
import { fetchCaldavEvents } from "@/lib/calendar-caldav"
import type { UnifiedCalendarEvent } from "@/lib/calendar-types"
import type { EmailAccountRow } from "@/lib/email-account-types"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const url = new URL(req.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params from and to (ISO 8601) are required" },
      { status: 400 }
    )
  }

  const merged: UnifiedCalendarEvent[] = []
  const errors: string[] = []

  const { data: accounts } = await listEmailAccounts(supabase, user.id)
  for (const acc of accounts) {
    const row = acc as EmailAccountRow
    try {
      if (row.provider === "gmail") {
        merged.push(
          ...(await fetchGoogleCalendarEvents(supabase, user.id, row, from, to))
        )
      } else if (row.provider === "outlook") {
        merged.push(
          ...(await fetchMicrosoftCalendarEvents(supabase, user.id, row, from, to))
        )
      }
    } catch (e) {
      errors.push(
        `${row.oauth_email || row.id}: ${
          e instanceof Error ? e.message : "calendar failed"
        }`
      )
    }
  }

  const { data: calSources, error: calErr } = await supabase
    .from("calendar_sources")
    .select("*")
    .eq("user_id", user.id)

  if (calErr?.code === "PGRST205") {
    errors.push("calendar_sources table not found — run SQL migration.")
  }

  for (const src of calSources ?? []) {
    try {
      merged.push(
        ...(await fetchCaldavEvents(
          {
            id: src.id,
            display_name: src.display_name,
            caldav_url: src.caldav_url,
            caldav_username: src.caldav_username,
            caldav_password: src.caldav_password,
          },
          from,
          to
        ))
      )
    } catch (e) {
      errors.push(
        `CalDAV ${src.display_name || src.id}: ${
          e instanceof Error ? e.message : "failed"
        }`
      )
    }
  }

  merged.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  return NextResponse.json({ events: merged, errors })
}
