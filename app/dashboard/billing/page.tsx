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
import { Plus, Search, Receipt, Trash2, Pencil, DollarSign } from "lucide-react"

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  due_date: string | null
  paid_at: string | null
  description: string | null
  notes: string | null
  created_at: string
}

async function fetchInvoices() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (error) throw error
  return data as Invoice[]
}

const INV_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
]

function invStatusColor(status: string) {
  switch (status) {
    case "paid": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    case "sent": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "draft": return "bg-muted text-muted-foreground"
    case "overdue": return "bg-red-500/10 text-red-700 dark:text-red-400"
    case "cancelled": return "bg-muted text-muted-foreground line-through"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function BillingDesk() {
  const { data: invoices, isLoading } = useSWR("invoices", fetchInvoices)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)

  const filtered = invoices?.filter((inv) => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || (inv.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = filterStatus === "all" || inv.status === filterStatus
    return matchSearch && matchStatus
  }) || []

  const totalPaid = invoices?.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0) || 0
  const totalPending = invoices?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0) || 0

  const handleSave = async (formData: FormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id,
      invoice_number: formData.get("invoice_number") as string,
      amount: Number(formData.get("amount")),
      status: (formData.get("status") as string) || "draft",
      due_date: (formData.get("due_date") as string) || null,
      description: (formData.get("description") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }
    if (editing) {
      await supabase.from("invoices").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("invoices").insert(payload)
    }
    setDialogOpen(false); setEditing(null)
    mutate("invoices"); mutate("dashboard-stats")
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("invoices").delete().eq("id", id)
    mutate("invoices"); mutate("dashboard-stats")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Billing Desk</h2>
          <p className="text-sm text-muted-foreground">Track invoices, payments, and your VO revenue.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-[44px]"><Plus className="size-4" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
              <DialogDescription>Track a new invoice for a voice job.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)) }} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="invoice_number">Invoice # *</Label><Input id="invoice_number" name="invoice_number" required defaultValue={editing?.invoice_number || ""} className="min-h-[44px]" placeholder="INV-001" /></div>
                <div className="flex flex-col gap-2"><Label htmlFor="amount">Amount ($) *</Label><Input id="amount" name="amount" type="number" step="0.01" required defaultValue={editing?.amount || ""} className="min-h-[44px]" /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="status">Status</Label><Select name="status" defaultValue={editing?.status || "draft"}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent>{INV_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" defaultValue={editing?.due_date?.split("T")[0] || ""} className="min-h-[44px]" /></div>
              </div>
              <div className="flex flex-col gap-2"><Label htmlFor="description">Description</Label><Input id="description" name="description" defaultValue={editing?.description || ""} className="min-h-[44px]" placeholder="Commercial spot - Brand X" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes || ""} /></div>
              <Button type="submit" size="lg" className="min-h-[44px]">{editing ? "Update" : "Save Invoice"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="border-emerald-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10"><DollarSign className="size-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p><p className="text-xl font-bold text-foreground">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10"><Receipt className="size-5 text-emerald-400" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-xl font-bold text-foreground">${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="min-h-[44px] w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{INV_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Receipt className="size-10 text-muted-foreground mb-3" />
          <CardTitle className="text-lg mb-1">No invoices yet</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">Create your first invoice to start tracking revenue.</p>
          <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]"><Plus className="size-4" /> Create Your First Invoice</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium text-foreground">{inv.invoice_number}</span>
                    <Badge variant="secondary" className={invStatusColor(inv.status)}>{INV_STATUSES.find((s) => s.value === inv.status)?.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="text-base font-bold text-foreground">${Number(inv.amount).toFixed(2)}</span>
                    {inv.description && <span>{inv.description}</span>}
                    {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => { setEditing(inv); setDialogOpen(true) }}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
