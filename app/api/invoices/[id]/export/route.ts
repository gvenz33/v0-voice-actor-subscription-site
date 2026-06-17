import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserEmailSignature } from "@/lib/email-signature"
import { generateInvoicePdfBuffer, invoicePdfFilename } from "@/lib/invoice-pdf"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, business_name")
    .eq("id", user.id)
    .single()

  const senderName =
    profile?.business_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "VO Biz Suite"

  const signature = await getUserEmailSignature(supabase, user.id)
  const letterheadLines = signature
    ? signature.split("\n").map((l) => l.trim()).filter(Boolean)
    : []

  const pdfBuffer = await generateInvoicePdfBuffer({
    invoiceNumber: invoice.invoice_number,
    amount: Number(invoice.amount),
    dueDate: invoice.due_date,
    description: invoice.description,
    notes: invoice.notes,
    createdAt: invoice.created_at,
    senderName,
    senderEmail: user.email,
    letterheadLines,
  })

  const filename = invoicePdfFilename(invoice.invoice_number)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
