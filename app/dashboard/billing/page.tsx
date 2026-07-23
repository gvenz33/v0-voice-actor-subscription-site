"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { EmailAttachmentPicker } from "@/components/email-attachment-picker"
import { Plus, Search, Receipt, Trash2, Pencil, DollarSign, Send, Loader2, FileDown, Download, CreditCard, CheckCircle2 } from "lucide-react"
import { downloadFromApi } from "@/lib/download-blob"
import { fetchContactsPicker } from "@/lib/fetch-contacts-picker"
import {
  MAX_EMAIL_ATTACHMENT_BYTES,
  readFileAsBase64,
  totalAttachmentBytes,
} from "@/lib/read-file-base64"
import {
  BILLING_WORD_COUNT_SESSION_KEY,
  DEFAULT_WPM,
} from "@/lib/script-word-count"

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
  // Optional fields may exist depending on your Supabase schema.
  word_count?: number | null
  client_email?: string | null
  contact_id?: string | null
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
    case "paid": return "bg-violet-500/10 text-violet-700 dark:text-violet-400"
    case "sent": return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "draft": return "bg-muted text-muted-foreground"
    case "overdue": return "bg-red-500/10 text-red-700 dark:text-red-400"
    case "cancelled": return "bg-muted text-muted-foreground line-through"
    default: return "bg-muted text-muted-foreground"
  }
}

type RateTemplate = "cat1" | "cat2"

const ADDITIONAL_HALF_HOUR = 148
const FIRST_HOUR_BILLED_HALF_HOURS = 2

const BASE_RATES: Record<RateTemplate, number> = {
  cat1: 505,
  cat2: 563,
}

const META_MARKER = "VOBizSuite Invoice Meta:"

function splitNotesAndMeta(notes: string | null | undefined) {
  const notesStr = notes ?? ""
  const idx = notesStr.indexOf(META_MARKER)
  if (idx === -1) {
    return { userNotes: notesStr.trim(), metaBlock: "" }
  }
  return {
    userNotes: notesStr.slice(0, idx).trim(),
    metaBlock: notesStr.slice(idx).trim(),
  }
}

function parseInvoiceMeta(notes: string | null | undefined): {
  userNotes: string
  clientEmail: string
  wordCount: number | null
  rateTemplate: RateTemplate
  wpm: number
} {
  const { userNotes, metaBlock } = splitNotesAndMeta(notes)
  const clientEmail = metaBlock.match(/Client email:\s*([^\n\r]+)/i)?.[1]?.trim() || ""

  const wordCount = (() => {
    const m = metaBlock.match(/Word count:\s*(\d+)/i)
    return m ? Number(m[1]) : null
  })()

  const rateTemplateRaw = metaBlock.match(/Rate template:\s*(cat1|cat2)/i)?.[1]
  const rateTemplate = (rateTemplateRaw === "cat2" ? "cat2" : "cat1") as RateTemplate

  const wpmMatch = metaBlock.match(/WPM:\s*(\d+)/i)?.[1]
  const wpm = wpmMatch ? Number(wpmMatch) : DEFAULT_WPM

  return { userNotes, clientEmail, wordCount, rateTemplate, wpm }
}

function buildInvoiceNotes(params: {
  userNotes: string
  clientEmail: string
  wordCount: number
  rateTemplate: RateTemplate
  wpm: number
}) {
  const { userNotes, clientEmail, wordCount, rateTemplate, wpm } = params

  const metaLines = [
    META_MARKER,
    `Client email: ${clientEmail || ""}`,
    `Word count: ${Math.max(0, Math.floor(wordCount))}`,
    `Rate template: ${rateTemplate}`,
    `WPM: ${Math.max(0, Math.floor(wpm))}`,
  ]

  const metaBlock = metaLines.join("\n")
  if (!userNotes) return metaBlock
  return `${userNotes.trim()}\n\n${metaBlock}`
}

function computeInvoiceAmount(wordCount: number, wpm: number, rateTemplate: RateTemplate) {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return null
  if (!Number.isFinite(wpm) || wpm <= 0) return null

  // Convert words -> billed time using a configurable estimator (WPM).
  const wordsPerHour = wpm * 60
  const durationHours = wordCount / wordsPerHour

  // Billing model (SAG-AFTRA Corporate/Educational - Non-Broadcast table):
  // - Base first hour at selected Cat rate.
  // - Additional time billed at $148 per additional half-hour increment.
  const billedHalfHours = Math.max(FIRST_HOUR_BILLED_HALF_HOURS, Math.ceil(durationHours * 2))
  const additionalHalfHours = Math.max(0, billedHalfHours - FIRST_HOUR_BILLED_HALF_HOURS)
  const amount = BASE_RATES[rateTemplate] + additionalHalfHours * ADDITIONAL_HALF_HOUR

  return {
    amount: Number(amount.toFixed(2)),
    durationHours,
    billedHalfHours,
    additionalHalfHours,
  }
}

function estimateWordCountFromAmount(amount: number, rateTemplate: RateTemplate, wpm: number) {
  if (!Number.isFinite(amount) || amount < 0) return 0
  if (!Number.isFinite(wpm) || wpm <= 0) return 0

  const base = BASE_RATES[rateTemplate]
  if (amount <= base) {
    const estimatedHours = 1
    return Math.round(estimatedHours * wpm * 60)
  }

  const extra = amount - base
  const extraHalfHours = Math.ceil(extra / ADDITIONAL_HALF_HOUR)
  const billedHalfHours = FIRST_HOUR_BILLED_HALF_HOURS + extraHalfHours
  const estimatedHours = billedHalfHours / 2
  return Math.round(estimatedHours * wpm * 60)
}

function inferRateTemplateFromAmount(amount: number): RateTemplate {
  const diff1 = Math.abs(amount - BASE_RATES.cat1)
  const diff2 = Math.abs(amount - BASE_RATES.cat2)
  return diff2 < diff1 ? "cat2" : "cat1"
}

function toDateInputValue(dueDate: string | null | undefined) {
  if (!dueDate) return ""
  return dueDate.includes("T") ? dueDate.split("T")[0] : dueDate
}

function formatHours(durationHours: number) {
  if (!Number.isFinite(durationHours) || durationHours < 0) return "0h"
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h <= 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

async function fetchStripeConnectStatus() {
  const res = await fetch("/api/billing/connect-status")
  if (!res.ok) throw new Error("Failed to load Stripe status")
  return res.json() as Promise<{
    configured: boolean
    connected: boolean
    chargesEnabled: boolean
    detailsSubmitted: boolean
    payoutsEnabled: boolean
    platformConnectEnabled?: boolean
    platformStripeDisplayName?: string | null
    stripeMode?: string
    stripeKeySource?: string
  }>
}

export default function BillingDesk() {
  const { data: invoices, isLoading } = useSWR("invoices", fetchInvoices)
  const { data: stripeStatus, mutate: mutateStripeStatus } = useSWR(
    "billing-stripe-connect",
    fetchStripeConnectStatus
  )
  const { data: contactOptions } = useSWR("contact-picker", fetchContactsPicker)
  const { data: demoReelsData } = useSWR("/api/demo-reels", async (url) => {
    const res = await fetch(url)
    return res.json()
  })
  const { data: userMediaData } = useSWR("/api/user-media", async (url) => {
    const res = await fetch(url)
    return res.json()
  })
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [sendNotice, setSendNotice] = useState<{ success: string[]; warnings: string[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [exportingAll, setExportingAll] = useState(false)
  const [invoiceAttachments, setInvoiceAttachments] = useState<File[]>([])
  const [selectedDemoReelIds, setSelectedDemoReelIds] = useState<string[]>([])
  const [selectedUserMediaIds, setSelectedUserMediaIds] = useState<string[]>([])
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [stripeNotice, setStripeNotice] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeParam = params.get("stripe")
    if (stripeParam === "success") {
      setStripeNotice("Stripe setup updated. If payments are enabled, pay links will be included when you send invoices.")
      void mutateStripeStatus()
    } else if (stripeParam === "refresh") {
      setStripeNotice("Please finish connecting Stripe to accept online invoice payments.")
    }
    if (stripeParam) {
      const url = new URL(window.location.href)
      url.searchParams.delete("stripe")
      window.history.replaceState({}, "", url.pathname + url.search)
    }
  }, [mutateStripeStatus])

  const handleConnectStripe = async () => {
    setConnectingStripe(true)
    setStripeNotice(null)
    try {
      const res = await fetch("/api/billing/connect-stripe", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to connect Stripe")
      if (data.url) window.location.href = data.url
    } catch (err) {
      setStripeNotice(err instanceof Error ? err.message : "Failed to connect Stripe")
    } finally {
      setConnectingStripe(false)
    }
  }

  const stripeReady = Boolean(stripeStatus?.chargesEnabled)
  const platformConnectReady = stripeStatus?.platformConnectEnabled !== false
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get("wordCount")
    if (!q) return
    const n = Number(q)
    if (!Number.isFinite(n) || n <= 0) return
    try {
      sessionStorage.setItem(BILLING_WORD_COUNT_SESSION_KEY, String(Math.floor(n)))
    } catch {
      /* ignore */
    }
    const url = new URL(window.location.href)
    url.searchParams.delete("wordCount")
    window.history.replaceState({}, "", url.pathname + url.search)
  }, [])

  const [form, setForm] = useState<{
    invoiceNumber: string
    status: string
    dueDate: string
    description: string
    notes: string
    wordCount: string
    rateTemplate: RateTemplate
    wpm: string
    clientEmail: string
    contactId: string
  }>({
    invoiceNumber: "",
    status: "draft",
    dueDate: "",
    description: "",
    notes: "",
    wordCount: "",
    rateTemplate: "cat1",
    wpm: String(DEFAULT_WPM),
    clientEmail: "",
    contactId: "none",
  })

  const computed = useMemo(() => {
    if (!form.wordCount || !form.wpm) return null
    const wordCountNum = Number(form.wordCount)
    const wpmNum = Number(form.wpm)
    if (!Number.isFinite(wordCountNum) || wordCountNum <= 0) return null
    if (!Number.isFinite(wpmNum) || wpmNum <= 0) return null
    return computeInvoiceAmount(wordCountNum, wpmNum, form.rateTemplate)
  }, [form.wordCount, form.wpm, form.rateTemplate])

  useEffect(() => {
    if (!dialogOpen) return

    if (editing) {
      const meta = parseInvoiceMeta(editing.notes)
      const wpmVal = meta.wpm || DEFAULT_WPM
      const rateTemplate = meta.wordCount ? meta.rateTemplate : inferRateTemplateFromAmount(editing.amount)

      const inferredWordCount =
        meta.wordCount && meta.wordCount > 0
          ? meta.wordCount
          : estimateWordCountFromAmount(editing.amount, rateTemplate, wpmVal)

      setForm({
        invoiceNumber: editing.invoice_number || "",
        status: editing.status || "draft",
        dueDate: toDateInputValue(editing.due_date),
        description: editing.description || "",
        notes: meta.userNotes || "",
        wordCount: inferredWordCount ? String(inferredWordCount) : "",
        rateTemplate,
        wpm: String(wpmVal),
        clientEmail: meta.clientEmail || "",
        contactId: editing.contact_id || "none",
      })
      setFormError(null)
      setInvoiceAttachments([])
      setSelectedDemoReelIds([])
      setSelectedUserMediaIds([])
      return
    }

    let prefillWords = ""
    try {
      const s = sessionStorage.getItem(BILLING_WORD_COUNT_SESSION_KEY)
      if (s) {
        const n = Number(s)
        if (Number.isFinite(n) && n > 0) prefillWords = String(Math.floor(n))
        sessionStorage.removeItem(BILLING_WORD_COUNT_SESSION_KEY)
      }
    } catch {
      /* ignore */
    }
    setForm({
      invoiceNumber: "",
      status: "draft",
      dueDate: "",
      description: "",
      notes: "",
      wordCount: prefillWords,
      rateTemplate: "cat1",
      wpm: String(DEFAULT_WPM),
      clientEmail: "",
      contactId: "none",
    })
    setFormError(null)
    setInvoiceAttachments([])
    setSelectedDemoReelIds([])
    setSelectedUserMediaIds([])
  }, [dialogOpen, editing])

  const filtered = invoices?.filter((inv) => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || (inv.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = filterStatus === "all" || inv.status === filterStatus
    return matchSearch && matchStatus
  }) || []

  const totalPaid = invoices?.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0) || 0
  const totalPending = invoices?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0) || 0

  const upsertInvoice = async (statusOverride?: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    if (!form.invoiceNumber) throw new Error("Invoice # is required.")
    const billedInfo = computed
    if (!billedInfo) throw new Error("Could not calculate invoice amount. Check your inputs.")

    const wordCountNum = Number(form.wordCount)
    const wpmNum = Number(form.wpm)
    if (!Number.isFinite(wordCountNum) || wordCountNum <= 0) throw new Error("Please enter a valid word count.")
    if (!Number.isFinite(wpmNum) || wpmNum <= 0) throw new Error("Please enter a valid WPM value.")

    const notes = buildInvoiceNotes({
      userNotes: form.notes || "",
      clientEmail: form.clientEmail || "",
      wordCount: wordCountNum,
      rateTemplate: form.rateTemplate,
      wpm: wpmNum,
    })

    const payload = {
      user_id: user.id,
      invoice_number: form.invoiceNumber,
      amount: billedInfo.amount,
      status: statusOverride ?? form.status ?? "draft",
      due_date: form.dueDate ? form.dueDate : null,
      description: form.description ? form.description : null,
      notes,
      contact_id: form.contactId !== "none" ? form.contactId : null,
    }

    if (editing) {
      await supabase.from("invoices").update(payload).eq("id", editing.id)
      return editing.id
    }

    const { data, error } = await supabase
      .from("invoices")
      .insert(payload)
      .select("id")
      .single()
    if (error) throw error
    return data.id as string
  }

  const handleSave = async () => {
    setFormError(null)
    setSaving(true)
    try {
      await upsertInvoice()
      setDialogOpen(false)
      setEditing(null)
      mutate("invoices")
      mutate("dashboard-stats")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save invoice")
    } finally {
      setSaving(false)
    }
  }

  const handleSendInvoice = async () => {
    setFormError(null)
    setSending(true)
    try {
      if (!form.clientEmail) throw new Error("Client email is required to send the invoice.")
      const selectedReelBytes = ((demoReelsData?.reels ?? []) as Array<{
        id: string
        file_size?: number
      }>)
        .filter((r) => selectedDemoReelIds.includes(r.id))
        .reduce((sum, r) => sum + Number(r.file_size ?? 0), 0)
      const selectedMediaBytes = ((userMediaData?.media ?? []) as Array<{
        id: string
        file_size: number
      }>)
        .filter((m) => selectedUserMediaIds.includes(m.id))
        .reduce((sum, m) => sum + Number(m.file_size || 0), 0)
      if (
        totalAttachmentBytes(invoiceAttachments) + selectedReelBytes + selectedMediaBytes >
        MAX_EMAIL_ATTACHMENT_BYTES
      ) {
        throw new Error("Attachments exceed 25 MB total size limit.")
      }

      const invoiceId = await upsertInvoice("draft")

      const signatureText =
        typeof window !== "undefined"
          ? localStorage.getItem("vo_email_signature") || ""
          : ""

      const attachments = await Promise.all(
        invoiceAttachments.map(async (file) => ({
          filename: file.name,
          contentBase64: await readFileAsBase64(file),
          contentType: file.type || "application/octet-stream",
        }))
      )

      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          signatureText,
          attachments,
          demo_reel_ids: selectedDemoReelIds,
          user_media_ids: selectedUserMediaIds,
        }),
      })

      const data = (await res.json()) as {
        error?: string
        hasPaymentLink?: boolean
        paymentUrl?: string | null
        pdfAttached?: boolean
        warnings?: string[]
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send invoice email")
      }

      const successLines = ["Invoice emailed to client with PDF attached."]
      if (data.hasPaymentLink) {
        successLines.push("Online payment link included in the email.")
      }

      setSendNotice({
        success: successLines,
        warnings: data.warnings ?? [],
      })

      setDialogOpen(false)
      setEditing(null)
      mutate("invoices")
      mutate("dashboard-stats")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send invoice")
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("invoices").delete().eq("id", id)
    mutate("invoices"); mutate("dashboard-stats")
  }

  const handleDownloadPdf = async (inv: Invoice) => {
    setExportingId(inv.id)
    try {
      await downloadFromApi(
        `/api/invoices/${inv.id}/export`,
        `Invoice-${inv.invoice_number.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`,
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not download PDF")
    } finally {
      setExportingId(null)
    }
  }

  const handleExportSpreadsheet = async () => {
    setExportingAll(true)
    try {
      await downloadFromApi("/api/invoices/export", "vobizsuite-invoices.csv")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not export spreadsheet")
    } finally {
      setExportingAll(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {sendNotice && (
        <Alert className="border-violet-500/30 bg-violet-500/5">
          <AlertTitle>Invoice sent</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            {sendNotice.success.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {sendNotice.warnings.map((line) => (
              <p key={line} className="text-amber-700 dark:text-amber-400">
                {line.includes("Connect Stripe") ? (
                  <>
                    {line}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        document.getElementById("get-paid-stripe")?.scrollIntoView({ behavior: "smooth" })
                      }}
                    >
                      Connect Stripe below
                    </button>
                    .
                  </>
                ) : (
                  line
                )}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
      {stripeNotice && (
        <Alert className="border-artist-green/30 bg-artist-green/5">
          <AlertTitle>Stripe</AlertTitle>
          <AlertDescription>{stripeNotice}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Billing Desk</h2>
          <p className="text-sm text-muted-foreground">Track invoices, payments, and your VO revenue.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-[44px]"
            disabled={exportingAll || !invoices?.length}
            onClick={() => void handleExportSpreadsheet()}
          >
            {exportingAll ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            Export to Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setFormError(null) } }}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-[44px]"><Plus className="size-4" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
              <DialogDescription>Track a new invoice for a voice job.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="flex flex-col gap-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertTitle>Action failed</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invoice_number">Invoice # *</Label>
                  <Input
                    id="invoice_number"
                    name="invoice_number"
                    required
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    className="min-h-[44px]"
                    placeholder="INV-001"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Calculated Total ($)</Label>
                  <div className="min-h-[44px] flex items-center rounded-md border border-input bg-muted/30 px-3">
                    <span className="font-semibold">
                      ${computed?.amount?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger id="status" className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INV_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="word_count">Word count *</Label>
                  <Input
                    id="word_count"
                    name="word_count"
                    type="number"
                    step="1"
                    min={0}
                    required
                    value={form.wordCount}
                    onChange={(e) => setForm((f) => ({ ...f, wordCount: e.target.value }))}
                    className="min-h-[44px]"
                    placeholder="e.g. 2500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rate_template">Rate template *</Label>
                  <Select
                    value={form.rateTemplate}
                    onValueChange={(v) => setForm((f) => ({ ...f, rateTemplate: v as RateTemplate }))}
                  >
                    <SelectTrigger id="rate_template" className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cat1">Cat 1 (First hour: $505)</SelectItem>
                      <SelectItem value="cat2">Cat 2 (First hour: $563)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="wpm">Words per minute (WPM) *</Label>
                  <Input
                    id="wpm"
                    name="wpm"
                    type="number"
                    step="1"
                    min={1}
                    required
                    value={form.wpm}
                    onChange={(e) => setForm((f) => ({ ...f, wpm: e.target.value }))}
                    className="min-h-[44px]"
                    placeholder="150"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Estimated billed time</Label>
                  <div className="min-h-[44px] flex items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                    {computed ? (
                      <span>
                        {formatHours(computed.durationHours)} ({computed.billedHalfHours / 2} hour[s])
                      </span>
                    ) : (
                      "Enter word count + WPM"
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="invoice_contact_id">Link to client (optional)</Label>
                <Select
                  value={form.contactId}
                  onValueChange={(v) => {
                    setForm((f) => {
                      const next = { ...f, contactId: v }
                      if (v !== "none") {
                        const c = contactOptions?.find((x) => x.id === v)
                        if (c?.email) next.clientEmail = c.email
                      }
                      return next
                    })
                  }}
                >
                  <SelectTrigger id="invoice_contact_id" className="min-h-[44px]">
                    <SelectValue placeholder="Choose from Client Hub…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client linked</SelectItem>
                    {(contactOptions || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                        {c.contact_name ? ` — ${c.contact_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="client_email">Client email (required to send)</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                  className="min-h-[44px]"
                  placeholder="client@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-[44px]"
                  placeholder="Commercial spot - Brand X"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <EmailAttachmentPicker
                files={invoiceAttachments}
                onFilesChange={setInvoiceAttachments}
                demoReels={(demoReelsData?.reels ?? []) as Array<{
                  id: string
                  title: string
                  file_name: string
                  file_size: number
                }>}
                selectedDemoReelIds={selectedDemoReelIds}
                onDemoReelIdsChange={setSelectedDemoReelIds}
                userMedia={(userMediaData?.media ?? []) as Array<{
                  id: string
                  title: string
                  file_name: string
                  file_size: number
                  category: "resume" | "media" | "knowledge_base"
                }>}
                selectedUserMediaIds={selectedUserMediaIds}
                onUserMediaIdsChange={setSelectedUserMediaIds}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" size="lg" className="min-h-[44px]" disabled={saving || sending}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                    </>
                  ) : editing ? (
                    "Update"
                  ) : (
                    "Save Invoice"
                  )}
                </Button>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <p className="text-xs text-muted-foreground">
                    Email includes a PDF invoice. Connect Stripe above to add a pay-online button.
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-[44px]"
                    variant="secondary"
                    onClick={handleSendInvoice}
                    disabled={sending || saving}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 size-4" /> Send to Client
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Rate assumptions (Billing Desk): First hour billed at the selected Cat rate; additional time billed at $148 per extra half-hour. Uses WPM to convert your word count to billed time. Source:{" "}
                <a
                  href="https://voiceoverresourceguide.com/voice-over-rates/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  voiceoverresourceguide.com
                </a>
                .
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card id="get-paid-stripe" className="artist-card-teal ring-1 ring-artist-teal/30">
        <CardContent className="flex flex-col gap-4 p-6">
          {!platformConnectReady && stripeStatus?.configured && (
            <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/10">
              <AlertTitle>Stripe account mismatch</AlertTitle>
              <AlertDescription className="text-sm">
                The site is using Stripe account{" "}
                <span className="font-medium">{stripeStatus.platformStripeDisplayName || "legacy sandbox"}</span> (
                {stripeStatus.stripeMode} mode) without Connect enabled. In Vercel, set{" "}
                <span className="font-mono text-xs">STRIPE_SECRET_KEY_VO</span> to your VOBizSuite secret key from{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  dashboard.stripe.com/apikeys
                </a>
                , then redeploy. Also update{" "}
                <span className="font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_VO</span>{" "}
                to the matching publishable key.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-artist-teal/20">
                {stripeReady ? (
                  <CheckCircle2 className="size-5 text-artist-teal" />
                ) : (
                  <CreditCard className="size-5 text-artist-teal" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">Get paid with Stripe</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stripeReady
                    ? "Your account is ready. Clients can pay invoices online by card when you send an invoice."
                    : !platformConnectReady
                      ? "Online invoice payments are unavailable until the VOBizSuite Stripe keys are configured in Vercel."
                      : stripeStatus?.connected && stripeStatus.detailsSubmitted
                        ? "Finish Stripe setup to enable card payments on invoice emails."
                        : "Connect Stripe so clients can pay your invoices online by card. Payouts go to your bank on Stripe's schedule."}
                </p>
              </div>
            </div>
            {!stripeReady && platformConnectReady && (
              <Button
                type="button"
                variant="success"
                className="min-h-[44px] shrink-0"
                disabled={connectingStripe || stripeStatus === undefined}
                onClick={() => void handleConnectStripe()}
              >
                {connectingStripe ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 size-4" />
                )}
                {stripeStatus?.connected ? "Continue Stripe setup" : "Connect Stripe"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="border-violet-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10"><DollarSign className="size-5 text-violet-600" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p><p className="text-xl font-bold text-foreground">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
          </CardContent>
        </Card>
        <Card className="border-violet-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10"><Receipt className="size-5 text-violet-400" /></div>
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
                    {(() => {
                      const meta = parseInvoiceMeta(inv.notes)
                      if (!meta.wordCount) return null
                      return <span>Words: {meta.wordCount.toLocaleString("en-US")}</span>
                    })()}
                    {inv.description && <span>{inv.description}</span>}
                    {(() => {
                      const meta = parseInvoiceMeta(inv.notes)
                      if (!meta.clientEmail) return null
                      return <span>To: {meta.clientEmail}</span>
                    })()}
                    {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] min-w-[44px]"
                    title="Download PDF"
                    disabled={exportingId === inv.id}
                    onClick={() => void handleDownloadPdf(inv)}
                  >
                    {exportingId === inv.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileDown className="size-3.5" />
                    )}
                  </Button>
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
