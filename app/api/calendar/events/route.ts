import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listEmailAccounts } from "@/lib/email-accounts-server"
import { fetchGoogleCalendarEvents } from "@/lib/calendar-google"
import { fetchMicrosoftCalendarEvents } from "@/lib/calendar-microsoft"
import { fetchCaldavEvents } from "@/lib/calendar-caldav"
import type { UnifiedCalendarEvent } from "@/lib/calendar-types"
import type { EmailAccountRow } from "@/lib/email-account-types"

export const runtime = "nodejs"

type ManualEventRow = {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
}

function toUnifiedManual(row: ManualEventRow): UnifiedCalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: row.starts_at,
    end: row.ends_at,
    allDay: row.all_day,
    provider: "manual",
    sourceLabel: "Manual",
    description: row.description,
    location: row.location,
    editable: true,
  }
}

function parseIso(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

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

  // Manual events (VO Biz Suite)
  const { data: manualRows, error: manualErr } = await supabase
    .from("calendar_events")
    .select("id, title, description, location, starts_at, ends_at, all_day")
    .eq("user_id", user.id)
    .lt("starts_at", to)
    .gt("ends_at", from)
    .order("starts_at", { ascending: true })

  if (manualErr?.code === "PGRST205") {
    errors.push("calendar_events table not found — run SQL migration.")
  } else if (manualErr) {
    errors.push(`Manual events: ${manualErr.message}`)
  } else {
    for (const row of (manualRows ?? []) as ManualEventRow[]) {
      merged.push(toUnifiedManual(row))
    }
  }

  // Linked calendars (Google / Microsoft via connected email)
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

  // Linked CalDAV (e.g. iCloud) from Settings
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

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as {
    title?: string
    description?: string | null
    location?: string | null
    start?: string
    end?: string
    allDay?: boolean
  }

  const title = body.title?.trim()
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 })
  }

  const start = parseIso(body.start, "start")
  const end = parseIso(body.end, "end")
  if (!start || !end) {
    return NextResponse.json(
      { error: "Valid start and end times are required." },
      { status: 400 }
    )
  }
  if (new Date(end).getTime() < new Date(start).getTime()) {
    return NextResponse.json(
      { error: "End time must be on or after the start time." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: user.id,
      title,
      description: body.description?.trim() || null,
      location: body.location?.trim() || null,
      starts_at: start,
      ends_at: end,
      all_day: Boolean(body.allDay),
    })
    .select("id, title, description, location, starts_at, ends_at, all_day")
    .single()

  if (error) {
    if (error.code === "PGRST205") {
      return NextResponse.json(
        { error: "calendar_events table not found — run SQL migration." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ event: toUnifiedManual(data as ManualEventRow) })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as {
    id?: string
    title?: string
    description?: string | null
    location?: string | null
    start?: string
    end?: string
    allDay?: boolean
  }

  if (!body.id) {
    return NextResponse.json({ error: "Event id is required." }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 })
    }
    updates.title = title
  }
  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null
  }
  if (body.location !== undefined) {
    updates.location = body.location?.trim() || null
  }
  if (body.allDay !== undefined) {
    updates.all_day = Boolean(body.allDay)
  }
  if (body.start !== undefined) {
    const start = parseIso(body.start, "start")
    if (!start) {
      return NextResponse.json({ error: "Valid start time is required." }, { status: 400 })
    }
    updates.starts_at = start
  }
  if (body.end !== undefined) {
    const end = parseIso(body.end, "end")
    if (!end) {
      return NextResponse.json({ error: "Valid end time is required." }, { status: 400 })
    }
    updates.ends_at = end
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("id, title, description, location, starts_at, ends_at, all_day")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 })
  }

  return NextResponse.json({ event: toUnifiedManual(data as ManualEventRow) })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Query param id is required." }, { status: 400 })
  }

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
