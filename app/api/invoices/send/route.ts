import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseInvoiceMeta } from "@/lib/invoice-billing"
import { buildInvoiceEmailContent } from "@/lib/invoice-email"
import { generateInvoicePdfBuffer, invoicePdfFilename } from "@/lib/invoice-pdf"
import { createInvoicePaymentLink } from "@/lib/invoice-stripe-payment"
import {
  appendSignatureToHtml,
  appendSignatureToPlainText,
  getUserEmailSignature,
} from "@/lib/email-signature"
import { sendEmailMessage } from "@/lib/send-email-message"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json()) as {
    invoiceId?: string
    account_id?: string
    signatureText?: string
  }

  if (!body.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 })
  }

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", body.invoiceId)
      .eq("user_id", user.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const meta = parseInvoiceMeta(invoice.notes)
    const clientEmail = meta.clientEmail?.trim()

    if (!clientEmail) {
      return NextResponse.json(
        { error: "Client email is required on the invoice before sending." },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, business_name, stripe_connect_account_id")
      .eq("id", user.id)
      .single()

    const senderName =
      profile?.business_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      "VO Biz Suite"

    let paymentUrl: string | null = invoice.stripe_payment_link_url ?? null

    if (profile?.stripe_connect_account_id) {
      try {
        const paymentLink = await createInvoicePaymentLink({
          connectAccountId: profile.stripe_connect_account_id,
          amount: Number(invoice.amount),
          invoiceNumber: invoice.invoice_number,
          description: invoice.description,
          invoiceId: invoice.id,
          userId: user.id,
        })
        paymentUrl = paymentLink.url

        await supabase
          .from("invoices")
          .update({
            stripe_payment_link_id: paymentLink.id,
            stripe_payment_link_url: paymentLink.url,
          })
          .eq("id", invoice.id)
      } catch (stripeErr) {
        console.warn("[invoices/send] Stripe payment link skipped:", stripeErr)
      }
    }

    const pdfBuffer = await generateInvoicePdfBuffer({
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      dueDate: invoice.due_date,
      description: invoice.description,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      senderName,
      senderEmail: user.email,
    })

    const emailContent = buildInvoiceEmailContent({
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      dueDate: invoice.due_date,
      description: invoice.description,
      notes: invoice.notes,
      paymentUrl,
      senderName,
    })

    const dbSignature = await getUserEmailSignature(supabase, user.id)
    const signature = (body.signatureText?.trim() || dbSignature).trim()

    const textBody = appendSignatureToPlainText(emailContent.textBody, signature)
    const htmlBody = appendSignatureToHtml(emailContent.htmlBody, signature)

    const sendResult = await sendEmailMessage(supabase, {
      userId: user.id,
      to: clientEmail,
      subject: emailContent.subject,
      text: textBody,
      html: htmlBody,
      accountId: body.account_id,
      attachments: [
        {
          filename: invoicePdfFilename(invoice.invoice_number),
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id)

    return NextResponse.json({
      success: true,
      paymentUrl,
      hasPaymentLink: Boolean(paymentUrl),
      ...sendResult,
    })
  } catch (err) {
    console.error("[invoices/send]", err)
    const message = err instanceof Error ? err.message : "Failed to send invoice"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
