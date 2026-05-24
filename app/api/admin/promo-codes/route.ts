import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  createPromoCodeAdmin,
  listPromoCodesAdmin,
  type PromoCodeInput,
} from "@/lib/promo-codes-server"

export async function GET() {
  const { error } = await requireAdmin()
  if (error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const promoCodes = await listPromoCodesAdmin()
    return NextResponse.json({ promoCodes })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load promo codes."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = (await request.json()) as PromoCodeInput

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Promo code is required." }, { status: 400 })
    }

    if (!body.discount_type || !body.discount_value) {
      return NextResponse.json({ error: "Discount type and value are required." }, { status: 400 })
    }

    const promoCode = await createPromoCodeAdmin(body)
    return NextResponse.json({ promoCode })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create promo code."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
