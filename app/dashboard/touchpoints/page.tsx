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
import { Plus, Search, MessageSquare, Trash2, Pencil, Mail, Phone, Linkedin, Video, Globe } from "lucide-react"

interface Touchpoint {
  id: string
  type: string
  subject: string | null
  body: string | null
  direction: string
  status: string
  scheduled_at: string | null
  completed_at: string | null
  notes: string | null
  contact_id: string | null
  created_at: string
}

async function fetchTouchpoints() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from("touchpoints").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (error) throw error
  return data as Touchpoint[]
}

const TOUCH_TYPES = [
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone Call", icon: Phone },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "social_media", label: "Social Media", icon: Globe },
  { value: "video_call", label: "Video Call", icon: Video },
  { value: "in_person", label: "In Person", icon: MessageSquare },
  { value: "other", label: "Other", icon: MessageSquare },
]

const TOUCH_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "sent", label: "Sent / Done" },
  { value: "responded", label: "Responded" },
  { value: "no_response", label: "No Response" },
]

function touchStatusColor(status: string) {
  switch (status) {
    case "responded": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    case "sent": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "planned": return "bg-sky-500/10 text-sky-700 dark:text-sky-400"
    case "no_response": return "bg-muted text-muted-foreground"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function TouchpointsPage() {
  const { data: touchpoints, isLoading } = useSWR("touchpoints", fetchTouchpoints)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Touchpoint | null>(null)

  const filtered = touchpoints?.filter((t) => {
    const matchSearch = (t.subject?.toLowerCase().includes(search.toLowerCase()) ?? false) || (t.body?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = filterStatus === "all" || t.status === filterStatus
    return matchSearch && matchStatus
  }) || []

  const handleSave = async (formData: FormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id,
      type: (formData.get("type") as string) || "email",
      subject: (formData.get("subject") as string) || null,
      body: (formData.get("body") as string) || null,
      direction: (formData.get("direction") as string) || "outbound",
      status: (formData.get("status") as string) || "planned",
      scheduled_at: (formData.get("scheduled_at") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }
    if (editing) {
      await supabase.from("touchpoints").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("touchpoints").insert(payload)
    }
    setDialogOpen(false); setEditing(null)
    mutate("touchpoints"); mutate("dashboard-stats")
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("touchpoints").delete().eq("id", id)
    mutate("touchpoints"); mutate("dashboard-stats")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Touchpoints</h2>
          <p className="text-sm text-muted-foreground">Track every outreach, follow-up, and conversation.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-[44px]"><Plus className="size-4" /> Log Touchpoint</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Touchpoint" : "Log New Touchpoint"}</DialogTitle>
              <DialogDescription>Record an outreach or follow-up interaction.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)) }} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="type">Type</Label><Select name="type" defaultValue={editing?.type || "email"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent>{TOUCH_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="direction">Direction</Label><Select name="direction" defaultValue={editing?.direction || "outbound"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="outbound">Outbound</SelectItem><SelectItem value="inbound">Inbound</SelectItem></SelectContent></Select></div>
              </div>
              <div className="flex flex-col gap-2"><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" defaultValue={editing?.subject || ""} className="min-h-[44px]" placeholder="e.g. Follow-up on commercial audition" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="body">Message / Details</Label><Textarea id="body" name="body" rows={4} defaultValue={editing?.body || ""} placeholder="Write your outreach message here..." /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="status">Status</Label><Select name="status" defaultValue={editing?.status || "planned"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent>{TOUCH_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="scheduled_at">Scheduled Date</Label><Input id="scheduled_at" name="scheduled_at" type="date" defaultValue={editing?.scheduled_at?.split("T")[0] || ""} className="min-h-[44px]" /></div>
              </div>
              <div className="flex flex-col gap-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes || ""} /></div>
              <Button type="submit" size="lg" className="min-h-[44px]">{editing ? "Update" : "Save Touchpoint"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search touchpoints..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="min-h-[44px] w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{TOUCH_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <MessageSquare className="size-10 text-muted-foreground mb-3" />
          <CardTitle className="text-lg mb-1">No touchpoints yet</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">Start logging your outreach and follow-ups.</p>
          <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]"><Plus className="size-4" /> Log Your First Touchpoint</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((tp) => {
            const TypeIcon = TOUCH_TYPES.find((t) => t.value === tp.type)?.icon || MessageSquare
            return (
              <Card key={tp.id}>
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><TypeIcon className="size-4 text-muted-foreground" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{tp.subject || TOUCH_TYPES.find((t) => t.value === tp.type)?.label}</span>
                        <Badge variant="secondary" className={touchStatusColor(tp.status)}>{TOUCH_STATUSES.find((s) => s.value === tp.status)?.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{tp.direction === "outbound" ? "Outbound" : "Inbound"}</Badge>
                      </div>
                      {tp.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tp.body}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {tp.scheduled_at && <span>Scheduled: {new Date(tp.scheduled_at).toLocaleDateString()}</span>}
                        <span>{new Date(tp.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => { setEditing(tp); setDialogOpen(true) }}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(tp.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
