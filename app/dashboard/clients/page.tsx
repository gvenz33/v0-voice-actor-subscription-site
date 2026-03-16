"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Building2, Mail, Phone, Globe, Trash2, Pencil, Upload, Download } from "lucide-react"
import { ContactsImportExport } from "@/components/contacts-import-export"

interface Contact {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
  status: string
  notes: string | null
  last_contacted_at: string | null
  created_at: string
}

async function fetchContacts() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Contact[]
}

const CATEGORIES = [
  { value: "production_company", label: "Production Company" },
  { value: "ad_agency", label: "Ad Agency" },
  { value: "studio", label: "Studio" },
  { value: "direct_client", label: "Direct Client" },
  { value: "e_learning", label: "E-Learning" },
  { value: "podcast", label: "Podcast" },
  { value: "other", label: "Other" },
]

const STATUSES = [
  { value: "prospect", label: "Prospect" },
  { value: "pitched", label: "Pitched" },
  { value: "active", label: "Active" },
  { value: "past_client", label: "Past Client" },
  { value: "cold", label: "Cold" },
]

function statusColor(status: string) {
  switch (status) {
    case "active": return "bg-violet-500/10 text-violet-700 dark:text-violet-400"
    case "pitched": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "prospect": return "bg-sky-500/10 text-sky-700 dark:text-sky-400"
    case "past_client": return "bg-muted text-muted-foreground"
    case "cold": return "bg-red-500/10 text-red-700 dark:text-red-400"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function ClientHub() {
  const { data: contacts, isLoading } = useSWR("contacts", fetchContacts)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const filtered = contacts?.filter((c) => {
    const matchSearch =
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = filterStatus === "all" || c.status === filterStatus
    return matchSearch && matchStatus
  }) || []

  const handleSave = async (formData: FormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      company_name: formData.get("company_name") as string,
      contact_name: (formData.get("contact_name") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      website: (formData.get("website") as string) || null,
      category: (formData.get("category") as string) || null,
      status: (formData.get("status") as string) || "prospect",
      notes: (formData.get("notes") as string) || null,
    }

    if (editingContact) {
      await supabase.from("contacts").update(payload).eq("id", editingContact.id)
    } else {
      await supabase.from("contacts").insert(payload)
    }

    setDialogOpen(false)
    setEditingContact(null)
    mutate("contacts")
    mutate("dashboard-stats")
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("contacts").delete().eq("id", id)
    mutate("contacts")
    mutate("dashboard-stats")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
            Client Hub
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your contacts, prospects, and production companies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" className="min-h-[44px]" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            <span className="hidden sm:inline ml-1.5">Import</span>
          </Button>
          <Button variant="outline" size="lg" className="min-h-[44px]" onClick={() => setExportOpen(true)} disabled={!contacts?.length}>
            <Download className="size-4" />
            <span className="hidden sm:inline ml-1.5">Export</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingContact(null) }}>
            <DialogTrigger asChild>
              <Button size="lg" className="min-h-[44px]">
                <Plus className="size-4" />
                Add Contact
              </Button>
            </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
              <DialogDescription>
                {editingContact ? "Update this contact's information." : "Add a new company or client to your CRM."}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave(new FormData(e.currentTarget))
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="company_name">Company / Client Name *</Label>
                <Input id="company_name" name="company_name" required defaultValue={editingContact?.company_name || ""} className="min-h-[44px]" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact_name">Contact Person</Label>
                <Input id="contact_name" name="contact_name" defaultValue={editingContact?.contact_name || ""} className="min-h-[44px]" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingContact?.email || ""} className="min-h-[44px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editingContact?.phone || ""} className="min-h-[44px]" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={editingContact?.website || ""} className="min-h-[44px]" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue={editingContact?.category || ""}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingContact?.status || "prospect"}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={editingContact?.notes || ""} />
              </div>
              <Button type="submit" size="lg" className="min-h-[44px]">
                {editingContact ? "Update Contact" : "Save Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      
      <ContactsImportExport 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        mode="import" 
      />
      <ContactsImportExport 
        open={exportOpen} 
        onOpenChange={setExportOpen} 
        mode="export" 
        contacts={contacts}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[44px] pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="min-h-[44px] w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-32 rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-4 w-48 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Building2 className="size-10 text-muted-foreground mb-3" />
          <CardTitle className="text-lg mb-1">No contacts yet</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">
            Start building your client list by adding your first contact.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]">
            <Plus className="size-4" /> Add Your First Contact
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact) => (
            <Card key={contact.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{contact.company_name}</CardTitle>
                    {contact.contact_name && (
                      <p className="text-sm text-muted-foreground">{contact.contact_name}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={statusColor(contact.status)}>
                    {STATUSES.find((s) => s.value === contact.status)?.label || contact.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-3.5" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="size-3.5" />
                    <span className="truncate">{contact.website}</span>
                  </div>
                )}
                {contact.category && (
                  <Badge variant="outline" className="w-fit text-[10px]">
                    {CATEGORIES.find((c) => c.value === contact.category)?.label}
                  </Badge>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => { setEditingContact(contact); setDialogOpen(true) }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                    onClick={() => handleDelete(contact.id)}
                  >
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
