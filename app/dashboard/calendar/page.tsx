"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  addDays,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"

type CalEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  provider: string
  sourceLabel: string
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load")
  return res.json()
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const from = weekStart.toISOString()
  const to = endOfWeek(weekStart, { weekStartsOn: 0 }).toISOString()

  const key = `/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const { data, isLoading, error, mutate } = useSWR(key, fetcher)

  const events: CalEvent[] = data?.events ?? []
  const errs: string[] = data?.errors ?? []

  const grouped = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      const day = format(new Date(ev.start), "yyyy-MM-dd")
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(ev)
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    }
    return map
  }, [events])

  const days = useMemo(() => {
    const d: Date[] = []
    for (let i = 0; i < 7; i++) d.push(addDays(weekStart, i))
    return d
  }, [weekStart])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarIcon className="size-6" />
          Calendar
        </h2>
        <p className="text-sm text-muted-foreground">
          Google and Microsoft calendars from connected email accounts, plus iCloud (CalDAV) from
          Settings. Reconnect Gmail/Outlook after upgrading scopes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
        >
          Previous week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
        >
          This week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
        >
          Next week
        </Button>
        <Button variant="secondary" size="sm" onClick={() => mutate()}>
          Refresh
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
      </div>

      {errs.length > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {errs.join(" ")}
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Could not load calendar events.</p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {days.map((day) => {
            const keyDay = format(day, "yyyy-MM-dd")
            const list = grouped.get(keyDay) ?? []
            return (
              <Card key={keyDay} className="min-h-[200px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {format(day, "EEE MMM d")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {list.length === 0 && (
                    <p className="text-muted-foreground text-xs">No events</p>
                  )}
                  {list.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-md border border-border bg-muted/20 px-2 py-1.5"
                    >
                      <div className="font-medium line-clamp-2">{ev.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {ev.allDay
                          ? "All day"
                          : `${format(new Date(ev.start), "p")} – ${format(new Date(ev.end), "p")}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {ev.provider} · {ev.sourceLabel}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
