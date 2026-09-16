import { createClient } from "@/lib/supabase/client"

/** Convert an audition submission into a booking. */
export async function convertSubmissionToBooking(submission: {
  id: string
  project_title: string
  genre: string | null
  rate_quoted: number | null
  notes: string | null
  contact_id: string | null
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const noteParts = [
    submission.notes?.trim() || "",
    `Converted from submission ${submission.id}`,
  ].filter(Boolean)

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      project_title: submission.project_title,
      genre: submission.genre,
      status: "confirmed",
      rate_agreed: submission.rate_quoted,
      notes: noteParts.join("\n\n"),
      contact_id: submission.contact_id,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  await supabase
    .from("submissions")
    .update({ status: "booked" })
    .eq("id", submission.id)
    .eq("user_id", user.id)

  return data.id as string
}

/** Schedule a follow-up touchpoint from a submission. */
export async function scheduleFollowUpFromSubmission(submission: {
  id: string
  project_title: string
  follow_up_date: string | null
  contact_id: string | null
  notes: string | null
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const scheduled =
    submission.follow_up_date ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from("touchpoints")
    .insert({
      user_id: user.id,
      contact_id: submission.contact_id,
      type: "email",
      direction: "outbound",
      status: "planned",
      subject: `Follow up: ${submission.project_title}`,
      notes: submission.notes
        ? `${submission.notes}\n\nFrom submission ${submission.id}`
        : `From submission ${submission.id}`,
      scheduled_at: `${scheduled}T12:00:00`,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

/** Create a draft invoice from a booking and return its id. */
export async function createInvoiceFromBooking(booking: {
  id: string
  project_title: string
  rate_agreed: number | null
  notes: string | null
  contact_id?: string | null
  due_date?: string | null
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const amount = Number(booking.rate_agreed || 0)
  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`
  const meta = [
    "VOBizSuite Invoice Meta:",
    "Client email: ",
    `From booking: ${booking.id}`,
  ].join("\n")
  const notes = booking.notes?.trim()
    ? `${booking.notes.trim()}\n\n${meta}`
    : meta

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      invoice_number: invoiceNumber,
      amount: Number(amount.toFixed(2)),
      status: "draft",
      due_date: booking.due_date || null,
      description: booking.project_title,
      notes,
      contact_id: booking.contact_id || null,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}
