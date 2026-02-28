"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, CalendarCheck, Trash2, Pencil } from "lucide-react"

interface Booking {
  id: string
  project_title: string
  genre: string | null
  status: string
  rate_agreed: number | null
  due_date: string | null
  session_date: string | null
  usage_rights: string | null
  notes: string | null
  created_at: string
}

async function fetchBookings() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from("bookings").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (error) throw error
  return data as Booking[]
}

const BOOKING_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "recorded", label: "Recorded" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const GENRES = [
  { value: "commercial", label: "Commercial" }, { value: "narration", label: "Narration" },
  { value: "e_learning", label: "E-Learning" }, { value: "audiobook", label: "Audiobook" },
  { value: "animation", label: "Animation" }, { value: "video_game", label: "Video Game" },
  { value: "promo", label: "Promo" }, { value: "ivr", label: "IVR / Phone" },
  { value: "podcast", label: "Podcast" }, { value: "other", label: "Other" },
]

function bookingStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-violet-500/10 text-violet-700 dark:text-violet-400"
    case "delivered": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "in_progress": case "recorded": return "bg-sky-500/10 text-sky-700 dark:text-sky-400"
    case "confirmed": return "bg-sky-500/10 text-sky-700 dark:text-sky-400"
    case "cancelled": return "bg-red-500/10 text-red-700 dark:text-red-400"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function BookingsPage() {
  const { data: bookings, isLoading } = useSWR("bookings", fetchBookings)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)

  const filtered = bookings?.filter((b) => {
    const matchSearch = b.project_title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || b.status === filterStatus
    return matchSearch && matchStatus
  }) || []

  const handleSave = async (formData: FormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id,
      project_title: formData.get("project_title") as string,
      genre: (formData.get("genre") as string) || null,
      status: (formData.get("status") as string) || "confirmed",
      rate_agreed: formData.get("rate_agreed") ? Number(formData.get("rate_agreed")) : null,
      due_date: (formData.get("due_date") as string) || null,
      session_date: (formData.get("session_date") as string) || null,
      usage_rights: (formData.get("usage_rights") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }
    if (editing) {
      await supabase.from("bookings").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("bookings").insert(payload)
    }
    setDialogOpen(false); setEditing(null)
    mutate("bookings"); mutate("dashboard-stats")
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("bookings").delete().eq("id", id)
    mutate("bookings"); mutate("dashboard-stats")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Bookings</h2>
          <p className="text-sm text-muted-foreground">Manage your booked jobs, sessions, and deliveries.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-[44px]"><Plus className="size-4" /> Add Booking</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Booking" : "Add New Booking"}</DialogTitle>
              <DialogDescription>Record a confirmed gig or project.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)) }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="project_title">Project Title *</Label>
                <Input id="project_title" name="project_title" required defaultValue={editing?.project_title || ""} className="min-h-[44px]" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select name="genre" defaultValue={editing?.genre || ""}><SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{GENRES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editing?.status || "confirmed"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent>{BOOKING_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="rate_agreed">Rate Agreed ($)</Label><Input id="rate_agreed" name="rate_agreed" type="number" step="0.01" defaultValue={editing?.rate_agreed || ""} className="min-h-[44px]" /></div>
                <div className="flex flex-col gap-2"><Label htmlFor="session_date">Session Date</Label><Input id="session_date" name="session_date" type="date" defaultValue={editing?.session_date?.split("T")[0] || ""} className="min-h-[44px]" /></div>
              </div>
              <div className="flex flex-col gap-2"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" defaultValue={editing?.due_date?.split("T")[0] || ""} className="min-h-[44px]" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="usage_rights">Usage Rights</Label><Input id="usage_rights" name="usage_rights" defaultValue={editing?.usage_rights || ""} className="min-h-[44px]" placeholder="e.g. 1 year broadcast, web only..." /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes || ""} /></div>
              <Button type="submit" size="lg" className="min-h-[44px]">{editing ? "Update" : "Save Booking"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="min-h-[44px] w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{BOOKING_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <CalendarCheck className="size-10 text-muted-foreground mb-3" />
          <CardTitle className="text-lg mb-1">No bookings yet</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">When you land a gig, track it here.</p>
          <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]"><Plus className="size-4" /> Add Your First Booking</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{booking.project_title}</span>
                    <Badge variant="secondary" className={bookingStatusColor(booking.status)}>{BOOKING_STATUSES.find((s) => s.value === booking.status)?.label}</Badge>
                    {booking.genre && <Badge variant="outline" className="text-[10px]">{GENRES.find((g) => g.value === booking.genre)?.label}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {booking.rate_agreed && <span className="font-semibold text-foreground">${Number(booking.rate_agreed).toFixed(2)}</span>}
                    {booking.session_date && <span>Session: {new Date(booking.session_date).toLocaleDateString()}</span>}
                    {booking.due_date && <span>Due: {new Date(booking.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => { setEditing(booking); setDialogOpen(true) }}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(booking.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
