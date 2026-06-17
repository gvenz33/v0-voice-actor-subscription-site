import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseInvoiceMeta } from "@/lib/invoice-billing"

export const runtime = "nodejs"

function csvEscape(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-US")
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    "Invoice Number",
    "Status",
    "Amount",
    "Due Date",
    "Description",
    "Client Email",
    "Word Count",
    "Rate Template",
    "WPM",
    "Created Date",
    "Paid Date",
    "Notes",
  ]

  const rows = (invoices ?? []).map((inv) => {
    const meta = parseInvoiceMeta(inv.notes)
    return [
      inv.invoice_number,
      inv.status,
      Number(inv.amount).toFixed(2),
      formatDate(inv.due_date),
      inv.description ?? "",
      meta.clientEmail,
      meta.wordCount ?? "",
      meta.wordCount ? meta.rateTemplate.toUpperCase() : "",
      meta.wordCount ? meta.wpm : "",
      formatDate(inv.created_at),
      formatDate(inv.paid_at),
      meta.userNotes,
    ]
      .map(csvEscape)
      .join(",")
  })

  const csv = [headers.map(csvEscape).join(","), ...rows].join("\r\n")
  const bom = "\uFEFF"
  const body = bom + csv

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vobizsuite-invoices.csv"',
      "Cache-Control": "no-store",
    },
  })
}
