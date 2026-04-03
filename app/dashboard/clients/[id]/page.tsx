"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { parseInvoiceClientEmailFromNotes } from "@/lib/invoice-notes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Send,
} from "lucide-react"

type ContactRow = {
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

type SubmissionRow = {
  id: string
  project_title: string
  genre: string | null
  platform: string | null
  submitted_at: string
  status: string
  rate_quoted: number | null
  contact_id: string | null
}

type TouchpointRow = {
  id: string
  type: string
  subject: string | null
  status: string
  scheduled_at: string | null
  created_at: string
  contact_id: string | null
}

type BookingRow = {
  id: string
  project_title: string
  genre: string | null
  status: string
  rate_agreed: number | null
  due_date: string | null
  session_date: string | null
  created_at: string
  contact_id?: string | null
}

type InvoiceRow = {
  id: string
  invoice_number: string
  amount: number
  status: string
  due_date: string | null
  description: string | null
  notes: string | null
  created_at: string
  contact_id?: string | null
}

type ClientBundle = {
  contact: ContactRow
  submissions: SubmissionRow[]
  touchpoints: TouchpointRow[]
  bookings: BookingRow[]
  invoices: InvoiceRow[]
}

const CATEGORY_LABELS: Record<string, string> = {
  production_company: "Production Company",
  ad_agency: "Ad Agency",
  studio: "Studio",
  direct_client: "Direct Client",
  e_learning: "E-Learning",
  podcast: "Podcast",
  other: "Other",
}

const CONTACT_STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  pitched: "Pitched",
  active: "Active",
  past_client: "Past Client",
  cold: "Cold",
}

const SUB_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  callback: "Callback",
  booked: "Booked",
  declined: "Declined",
  no_response: "No Response",
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  in_progress: "In Progress",
  recorded: "Recorded",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

const INV_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

const TOUCH_STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  sent: "Sent / Done",
  responded: "Responded",
  no_response: "No Response",
}

async function fetchClientBundle(contactId: string): Promise<ClientBundle | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single()

  if (cErr || !contact) return null

  const [subRes, touchRes, bookRes, invRes] = await Promise.all([
    supabase
      .from("submissions")
      .select("*")
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("touchpoints")
      .select("*")
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ])

  // Bookings may 400 until `contact_id` exists — see scripts/add-contact-id-bookings-invoices.sql
  const bookings: BookingRow[] = bookRes.error ? [] : ((bookRes.data || []) as BookingRow[])
  const submissions: SubmissionRow[] = subRes.error ? [] : ((subRes.data || []) as SubmissionRow[])
  const touchpoints: TouchpointRow[] = touchRes.error ? [] : ((touchRes.data || []) as TouchpointRow[])

  const emailLower = (contact.email || "").trim().toLowerCase()
  const allInvoices = invRes.error ? [] : ((invRes.data || []) as InvoiceRow[])
  const invoices = allInvoices.filter((inv) => {
    if (inv.contact_id === contactId) return true
    if (!emailLower) return false
    const metaEmail = parseInvoiceClientEmailFromNotes(inv.notes)?.toLowerCase()
    return metaEmail === emailLower
  })

  return {
    contact: contact as ContactRow,
    submissions,
    touchpoints,
    bookings,
    invoices,
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : ""

  const { data, error, isLoading } = useSWR(id ? `client-detail/${id}` : null, () => fetchClientBundle(id))

  if (!id) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Invalid client.</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/dashboard/clients">Back to Client Hub</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {error ? "Could not load this client." : "Client not found."}
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/dashboard/clients">Back to Client Hub</Link>
        </Button>
      </div>
    )
  }

  const { contact, submissions, touchpoints, bookings, invoices } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/dashboard/clients" aria-label="Back to Client Hub">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
              {contact.company_name}
            </h2>
            <p className="text-sm text-muted-foreground">Client activity in one place</p>
          </div>
        </div>
        <Badge variant="secondary" className="w-fit">
          {CONTACT_STATUS_LABELS[contact.status] || contact.status}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {contact.contact_name && (
            <p>
              <span className="text-muted-foreground">Person: </span>
              {contact.contact_name}
            </p>
          )}
          {contact.email && (
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="underline">
                {contact.email}
              </a>
            </p>
          )}
          {contact.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 text-muted-foreground" />
              {contact.phone}
            </p>
          )}
          {contact.website && (
            <p className="flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground" />
              <a href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`} target="_blank" rel="noreferrer" className="underline truncate">
                {contact.website}
              </a>
            </p>
          )}
          {contact.category && (
            <Badge variant="outline" className="w-fit text-xs">
              {CATEGORY_LABELS[contact.category] || contact.category}
            </Badge>
          )}
          {contact.notes && <p className="text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Send className="size-3.5" /> Submissions
            </div>
            <p className="text-2xl font-bold mt-1">{submissions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <CalendarCheck className="size-3.5" /> Bookings
            </div>
            <p className="text-2xl font-bold mt-1">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Receipt className="size-3.5" /> Invoices
            </div>
            <p className="text-2xl font-bold mt-1">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <MessageSquare className="size-3.5" /> Touchpoints
            </div>
            <p className="text-2xl font-bold mt-1">{touchpoints.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto flex flex-col gap-2">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions linked. Link a client when you log a submission.</p>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{s.project_title}</div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{SUB_STATUS_LABELS[s.status] || s.status}</Badge>
                    <span>{new Date(s.submitted_at).toLocaleDateString()}</span>
                    {s.rate_quoted != null && <span>${Number(s.rate_quoted).toFixed(2)}</span>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto flex flex-col gap-2">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings linked. Add a client on a booking, or run the SQL in{" "}
                <code className="text-xs">scripts/add-contact-id-bookings-invoices.sql</code> if linking fails.
              </p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{b.project_title}</div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{BOOKING_STATUS_LABELS[b.status] || b.status}</Badge>
                    {b.session_date && <span>Session: {new Date(b.session_date).toLocaleDateString()}</span>}
                    {b.due_date && <span>Due: {new Date(b.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing (Invoices)</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto flex flex-col gap-2">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices for this client. Link a client on an invoice or use the same email as this contact in the invoice.
              </p>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="rounded-md border p-3 text-sm">
                  <div className="font-mono font-medium">{inv.invoice_number}</div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">${Number(inv.amount).toFixed(2)}</span>
                    <Badge variant="outline">{INV_STATUS_LABELS[inv.status] || inv.status}</Badge>
                    {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                  </div>
                  {inv.description && <p className="text-xs mt-1 text-muted-foreground">{inv.description}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Touchpoints</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto flex flex-col gap-2">
            {touchpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No touchpoints linked. Choose a client when you log outreach.</p>
            ) : (
              touchpoints.map((t) => (
                <div key={t.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{t.subject || t.type}</div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{TOUCH_STATUS_LABELS[t.status] || t.status}</Badge>
                    {t.scheduled_at && <span>Scheduled: {new Date(t.scheduled_at).toLocaleDateString()}</span>}
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
