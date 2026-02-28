"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Send, Trash2, Pencil } from "lucide-react"

interface Submission {
  id: string
  project_title: string
  genre: string | null
  platform: string | null
  submitted_at: string
  status: string
  rate_quoted: number | null
  notes: string | null
  follow_up_date: string | null
  contact_id: string | null
}

async function fetchSubmissions() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
  if (error) throw error
  return data as Submission[]
}

const GENRES = [
  { value: "commercial", label: "Commercial" },
  { value: "narration", label: "Narration" },
  { value: "e_learning", label: "E-Learning" },
  { value: "audiobook", label: "Audiobook" },
  { value: "animation", label: "Animation" },
  { value: "video_game", label: "Video Game" },
  { value: "promo", label: "Promo" },
  { value: "ivr", label: "IVR / Phone" },
  { value: "podcast", label: "Podcast" },
  { value: "other", label: "Other" },
]

const SUB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "callback", label: "Callback" },
  { value: "booked", label: "Booked" },
  { value: "declined", label: "Declined" },
  { value: "no_response", label: "No Response" },
]

function subStatusColor(status: string) {
  switch (status) {
    case "booked": return "bg-violet-500/10 text-violet-700 dark:text-violet-400"
    case "callback": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "submitted": return "bg-sky-500/10 text-sky-700 dark:text-sky-400"
    case "declined": return "bg-red-500/10 text-red-700 dark:text-red-400"
    case "no_response": return "bg-muted text-muted-foreground"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function SubmissionsPage() {
  const { data: submissions, isLoading } = useSWR("submissions", fetchSubmissions)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Submission | null>(null)

  const filtered = submissions?.filter((s) => {
    const matchSearch = s.project_title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || s.status === filterStatus
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
      platform: (formData.get("platform") as string) || null,
      status: (formData.get("status") as string) || "submitted",
      rate_quoted: formData.get("rate_quoted") ? Number(formData.get("rate_quoted")) : null,
      notes: (formData.get("notes") as string) || null,
      follow_up_date: (formData.get("follow_up_date") as string) || null,
    }

    if (editing) {
      await supabase.from("submissions").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("submissions").insert(payload)
    }

    setDialogOpen(false)
    setEditing(null)
    mutate("submissions")
    mutate("dashboard-stats")
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("submissions").delete().eq("id", id)
    mutate("submissions")
    mutate("dashboard-stats")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Submissions</h2>
          <p className="text-sm text-muted-foreground">Track every audition, demo, and pitch you send out.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-[44px]"><Plus className="size-4" /> Log Submission</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Submission" : "Log New Submission"}</DialogTitle>
              <DialogDescription>Record an audition or demo you have sent out.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)) }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="project_title">Project Title *</Label>
                <Input id="project_title" name="project_title" required defaultValue={editing?.project_title || ""} className="min-h-[44px]" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select name="genre" defaultValue={editing?.genre || ""}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{GENRES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editing?.status || "submitted"}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{SUB_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="platform">Platform / Source</Label>
                  <Input id="platform" name="platform" placeholder="e.g. Voices.com, direct email" defaultValue={editing?.platform || ""} className="min-h-[44px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rate_quoted">Rate Quoted ($)</Label>
                  <Input id="rate_quoted" name="rate_quoted" type="number" step="0.01" defaultValue={editing?.rate_quoted || ""} className="min-h-[44px]" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="follow_up_date">Follow-up Date</Label>
                <Input id="follow_up_date" name="follow_up_date" type="date" defaultValue={editing?.follow_up_date?.split("T")[0] || ""} className="min-h-[44px]" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes || ""} />
              </div>
              <Button type="submit" size="lg" className="min-h-[44px]">{editing ? "Update" : "Save Submission"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search submissions..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="min-h-[44px] w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {SUB_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Send className="size-10 text-muted-foreground mb-3" />
          <CardTitle className="text-lg mb-1">No submissions yet</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">Start tracking your auditions and demos.</p>
          <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]"><Plus className="size-4" /> Log Your First Submission</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{sub.project_title}</span>
                    <Badge variant="secondary" className={subStatusColor(sub.status)}>
                      {SUB_STATUSES.find((s) => s.value === sub.status)?.label}
                    </Badge>
                    {sub.genre && <Badge variant="outline" className="text-[10px]">{GENRES.find((g) => g.value === sub.genre)?.label}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {sub.platform && <span>{sub.platform}</span>}
                    {sub.rate_quoted && <span>${Number(sub.rate_quoted).toFixed(2)}</span>}
                    <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => { setEditing(sub); setDialogOpen(true) }}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(sub.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
