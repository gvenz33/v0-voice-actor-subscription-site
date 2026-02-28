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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, CheckSquare, Trash2, Pencil } from "lucide-react"

interface ActionItem {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  completed_at: string | null
  created_at: string
}

async function fetchActionItems() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from("action_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (error) throw error
  return data as ActionItem[]
}

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

const ITEM_STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
]

function priorityColor(p: string) {
  switch (p) {
    case "urgent": return "bg-red-500/10 text-red-700 dark:text-red-400"
    case "high": return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
    case "medium": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "low": return "bg-muted text-muted-foreground"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function ActionItemsPage() {
  const { data: items, isLoading } = useSWR("action-items", fetchActionItems)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ActionItem | null>(null)

  const filtered = items?.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || item.status === filterStatus
    return matchSearch && matchStatus
  }) || []

  const handleSave = async (formData: FormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      priority: (formData.get("priority") as string) || "medium",
      status: (formData.get("status") as string) || "todo",
      due_date: (formData.get("due_date") as string) || null,
    }
    if (editing) {
      await supabase.from("action_items").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("action_items").insert(payload)
    }
    setDialogOpen(false); setEditing(null)
    mutate("action-items"); mutate("dashboard-stats")
  }

  const handleToggleDone = async (item: ActionItem) => {
    const supabase = createClient()
    const newStatus = item.status === "done" ? "todo" : "done"
    await supabase.from("action_items").update({
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    }).eq("id", item.id)
    mutate("action-items"); mutate("dashboard-stats")
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("action_items").delete().eq("id", id)
    mutate("action-items"); mutate("dashboard-stats")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Action Items</h2>
          <p className="text-sm text-muted-foreground">Your to-do list for building your VO business.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-[44px]"><Plus className="size-4" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Task" : "Add New Task"}</DialogTitle>
              <DialogDescription>Create a task to keep your VO business moving.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)) }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2"><Label htmlFor="title">Task Title *</Label><Input id="title" name="title" required defaultValue={editing?.title || ""} className="min-h-[44px]" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={3} defaultValue={editing?.description || ""} /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2"><Label htmlFor="priority">Priority</Label><Select name="priority" defaultValue={editing?.priority || "medium"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="status">Status</Label><Select name="status" defaultValue={editing?.status || "todo"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent>{ITEM_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" defaultValue={editing?.due_date?.split("T")[0] || ""} className="min-h-[44px]" /></div>
              </div>
              <Button type="submit" size="lg" className="min-h-[44px]">{editing ? "Update" : "Save Task"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="min-h-[44px] w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{ITEM_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <CheckSquare className="size-10 text-muted-foreground mb-3" />
          <CardTitle className="text-lg mb-1">No action items</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">Add tasks to keep your voice business on track.</p>
          <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]"><Plus className="size-4" /> Add Your First Task</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <Card key={item.id} className={item.status === "done" ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <Checkbox
                  checked={item.status === "done"}
                  onCheckedChange={() => handleToggleDone(item)}
                  className="size-5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-foreground ${item.status === "done" ? "line-through" : ""}`}>{item.title}</span>
                    <Badge variant="secondary" className={priorityColor(item.priority)}>{item.priority}</Badge>
                    {item.status === "in_progress" && <Badge variant="outline" className="text-[10px]">In Progress</Badge>}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
                  {item.due_date && <span className="text-xs text-muted-foreground">Due: {new Date(item.due_date).toLocaleDateString()}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => { setEditing(item); setDialogOpen(true) }}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
