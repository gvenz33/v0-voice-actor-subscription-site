import { NextRequest, NextResponse } from "next/server"
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

function formatDate(value: string | null | undefined, style: "us" | "iso" = "us") {
  if (!value) return ""
  const d = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  if (style === "iso") return d.toISOString().slice(0, 10)
  return d.toLocaleDateString("en-US")
}

type ContactRow = {
  id: string
  company_name: string | null
  contact_name: string | null
  email: string | null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const format = (request.nextUrl.searchParams.get("format") || "vobiz").toLowerCase()

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const contactIds = [
    ...new Set(
      (invoices ?? [])
        .map((inv) => inv.contact_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const contactMap = new Map<string, ContactRow>()
  if (contactIds.length) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, company_name, contact_name, email")
      .in("id", contactIds)
    for (const c of contacts ?? []) {
      contactMap.set(c.id, c as ContactRow)
    }
  }

  let headers: string[]
  let rows: string[]
  let filename: string

  if (format === "qbo" || format === "quickbooks") {
    // Simplified QuickBooks Online invoice import style (one line item per invoice)
    headers = [
      "InvoiceNo",
      "Customer",
      "InvoiceDate",
      "DueDate",
      "ItemDescription",
      "ItemQuantity",
      "ItemRate",
      "ItemAmount",
      "Email",
      "Memo",
    ]
    rows = (invoices ?? []).map((inv) => {
      const meta = parseInvoiceMeta(inv.notes)
      const contact = inv.contact_id ? contactMap.get(inv.contact_id) : undefined
      const customer =
        contact?.company_name ||
        contact?.contact_name ||
        meta.clientEmail ||
        "Customer"
      const email = contact?.email || meta.clientEmail || ""
      const amount = Number(inv.amount || 0)
      return [
        inv.invoice_number,
        customer,
        formatDate(inv.created_at, "iso"),
        formatDate(inv.due_date, "iso"),
        inv.description || "Voice over services",
        1,
        amount.toFixed(2),
        amount.toFixed(2),
        email,
        meta.userNotes || "",
      ]
        .map(csvEscape)
        .join(",")
    })
    filename = "vobizsuite-invoices-quickbooks.csv"
  } else if (format === "xero") {
    // Xero invoice import (Sales Invoice) — common columns
    headers = [
      "*ContactName",
      "EmailAddress",
      "*InvoiceNumber",
      "*InvoiceDate",
      "*DueDate",
      "Description",
      "*Quantity",
      "*UnitAmount",
      "AccountCode",
      "TaxType",
      "Currency",
      "Status",
      "Reference",
    ]
    rows = (invoices ?? []).map((inv) => {
      const meta = parseInvoiceMeta(inv.notes)
      const contact = inv.contact_id ? contactMap.get(inv.contact_id) : undefined
      const customer =
        contact?.company_name ||
        contact?.contact_name ||
        meta.clientEmail ||
        "Customer"
      const email = contact?.email || meta.clientEmail || ""
      const amount = Number(inv.amount || 0)
      const status =
        inv.status === "paid"
          ? "PAID"
          : inv.status === "draft"
            ? "DRAFT"
            : "AUTHORISED"
      return [
        customer,
        email,
        inv.invoice_number,
        formatDate(inv.created_at, "iso"),
        formatDate(inv.due_date, "iso"),
        inv.description || "Voice over services",
        1,
        amount.toFixed(2),
        "200",
        "NONE",
        "USD",
        status,
        meta.userNotes || "",
      ]
        .map(csvEscape)
        .join(",")
    })
    filename = "vobizsuite-invoices-xero.csv"
  } else {
    headers = [
      "Invoice Number",
      "Status",
      "Amount",
      "Due Date",
      "Description",
      "Client Name",
      "Client Email",
      "Word Count",
      "Rate Template",
      "WPM",
      "Created Date",
      "Paid Date",
      "Notes",
    ]
    rows = (invoices ?? []).map((inv) => {
      const meta = parseInvoiceMeta(inv.notes)
      const contact = inv.contact_id ? contactMap.get(inv.contact_id) : undefined
      return [
        inv.invoice_number,
        inv.status,
        Number(inv.amount).toFixed(2),
        formatDate(inv.due_date),
        inv.description ?? "",
        contact?.company_name || contact?.contact_name || "",
        contact?.email || meta.clientEmail || "",
        meta.wordCount ?? "",
        meta.rateTemplate ? meta.rateTemplate.toUpperCase() : "",
        meta.wpm ?? "",
        formatDate(inv.created_at),
        formatDate(inv.paid_at),
        meta.userNotes,
      ]
        .map(csvEscape)
        .join(",")
    })
    filename = "vobizsuite-invoices.csv"
  }

  const csv = [headers.map(csvEscape).join(","), ...rows].join("\r\n")
  const bom = "\uFEFF"
  const body = bom + csv

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
