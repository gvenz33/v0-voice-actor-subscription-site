import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  deletePromoCodeAdmin,
  updatePromoCodeAdmin,
  type PromoCodeInput,
} from "@/lib/promo-codes-server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = (await request.json()) as Partial<PromoCodeInput>
    const promoCode = await updatePromoCodeAdmin(id, body)
    return NextResponse.json({ promoCode })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update promo code."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    await deletePromoCodeAdmin(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete promo code."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
