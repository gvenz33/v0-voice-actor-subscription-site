import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { InvoicePaymentProfile } from "@/lib/invoice-payment-instructions"

const SELECT =
  "payment_zelle, payment_venmo, payment_paypal, payment_other"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT)
    .eq("id", user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ payment: data as InvoicePaymentProfile })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as InvoicePaymentProfile

  const payload = {
    payment_zelle: body.payment_zelle?.trim() || null,
    payment_venmo: body.payment_venmo?.trim() || null,
    payment_paypal: body.payment_paypal?.trim() || null,
    payment_other: body.payment_other?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select(SELECT)
    .single()

  if (error) {
    if (error.code === "PGRST204") {
      return NextResponse.json(
        { error: "Payment instruction columns missing — run database migration." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ payment: data as InvoicePaymentProfile })
}
