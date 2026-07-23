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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

type CalEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  provider: string
  sourceLabel: string
  description?: string | null
  location?: string | null
  editable?: boolean
}

type EventFormState = {
  title: string
  description: string
  location: string
  startLocal: string
  endLocal: string
  allDay: boolean
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load")
  return res.json()
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string) {
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function defaultFormForDay(day?: Date): EventFormState {
  const base = day ? new Date(day) : new Date()
  base.setMinutes(0, 0, 0)
  if (!day) base.setHours(base.getHours() + 1)
  else base.setHours(10, 0, 0, 0)
  const end = new Date(base)
  end.setHours(end.getHours() + 1)
  return {
    title: "",
    description: "",
    location: "",
    startLocal: toLocalInputValue(base.toISOString()),
    endLocal: toLocalInputValue(end.toISOString()),
    allDay: false,
  }
}

function formFromEvent(ev: CalEvent): EventFormState {
  return {
    title: ev.title,
    description: ev.description ?? "",
    location: ev.location ?? "",
    startLocal: toLocalInputValue(ev.start),
    endLocal: toLocalInputValue(ev.end),
    allDay: ev.allDay,
  }
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const from = weekStart.toISOString()
  const to = endOfWeek(weekStart, { weekStartsOn: 0 }).toISOString()

  const key = `/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const { data, isLoading, error, mutate } = useSWR(key, fetcher)

  const events: CalEvent[] = data?.events ?? []
  const errs: string[] = data?.errors ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormState>(() => defaultFormForDay())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

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

  const openCreate = (day?: Date) => {
    setEditingId(null)
    setForm(defaultFormForDay(day))
    setFormError("")
    setDialogOpen(true)
  }

  const openEdit = (ev: CalEvent) => {
    if (!ev.editable) return
    setEditingId(ev.id)
    setForm(formFromEvent(ev))
    setFormError("")
    setDialogOpen(true)
  }

  const saveEvent = async () => {
    setSaving(true)
    setFormError("")
    try {
      const start = fromLocalInputValue(form.startLocal)
      const end = fromLocalInputValue(form.endLocal)
      if (!form.title.trim()) throw new Error("Title is required.")
      if (!start || !end) throw new Error("Valid start and end times are required.")

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        start,
        end,
        allDay: form.allDay,
        ...(editingId ? { id: editingId } : {}),
      }

      const res = await fetch("/api/calendar/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Could not save event.")

      setDialogOpen(false)
      await mutate()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save event.")
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this calendar event?")) return
    const res = await fetch(`/api/calendar/events?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || "Could not delete event.")
      return
    }
    await mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="size-6" />
            Calendar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add sessions and deadlines manually, and sync events from linked Google, Microsoft, and
            iCloud calendars in{" "}
            <Link href="/dashboard/settings" className="underline underline-offset-2">
              Settings
            </Link>
            .
          </p>
        </div>
        <Button type="button" className="min-h-[44px] shrink-0" onClick={() => openCreate()}>
          <Plus className="mr-2 size-4" />
          Add event
        </Button>
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
          <RefreshCw className="mr-1.5 size-3.5" />
          Sync calendars
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {format(day, "EEE MMM d")}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => openCreate(day)}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {list.length === 0 && (
                    <p className="text-muted-foreground text-xs">No events</p>
                  )}
                  {list.map((ev) => (
                    <div
                      key={`${ev.provider}-${ev.id}`}
                      className="rounded-md border border-border bg-muted/20 px-2 py-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium line-clamp-2">{ev.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {ev.allDay
                              ? "All day"
                              : `${format(new Date(ev.start), "p")} – ${format(new Date(ev.end), "p")}`}
                          </div>
                          {ev.location ? (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {ev.location}
                            </div>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {ev.provider === "manual" ? "Manual" : ev.provider}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {ev.sourceLabel}
                            </span>
                          </div>
                        </div>
                        {ev.editable && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              onClick={() => openEdit(ev)}
                              title="Edit event"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => void deleteEvent(ev.id)}
                              title="Delete event"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "Add calendar event"}</DialogTitle>
            <DialogDescription>
              Manual events stay in VO Biz Suite. Linked calendar events continue to sync from
              Settings when you refresh.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cal-title">Title</Label>
              <Input
                id="cal-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Session, deadline, follow-up…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cal-start">Starts</Label>
                <Input
                  id="cal-start"
                  type="datetime-local"
                  value={form.startLocal}
                  onChange={(e) => setForm((f) => ({ ...f, startLocal: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-end">Ends</Label>
                <Input
                  id="cal-end"
                  type="datetime-local"
                  value={form.endLocal}
                  onChange={(e) => setForm((f) => ({ ...f, endLocal: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.allDay}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, allDay: checked === true }))
                }
              />
              All-day event
            </label>
            <div className="space-y-2">
              <Label htmlFor="cal-location">Location (optional)</Label>
              <Input
                id="cal-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Studio, Zoom, client site…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal-notes">Notes (optional)</Label>
              <Textarea
                id="cal-notes"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Script notes, call sheet details…"
              />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveEvent()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
