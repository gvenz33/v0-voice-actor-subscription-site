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
import { loadDemoReelAttachments } from "@/lib/demo-reels-server"
import { sendEmailMessage } from "@/lib/send-email-message"
import { loadUserMediaAttachments } from "@/lib/user-media-server"

export const runtime = "nodejs"
export const maxDuration = 60

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
    attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }>
    demo_reel_ids?: string[]
    user_media_ids?: string[]
  }

  if (!body.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 })
  }

  const warnings: string[] = []

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
        const msg =
          stripeErr instanceof Error ? stripeErr.message : "Stripe payment link failed"
        warnings.push(`Pay link not included: ${msg}`)
        console.warn("[invoices/send] Stripe payment link skipped:", stripeErr)
      }
    } else {
      warnings.push(
        "No pay link included. Connect Stripe under Billing Desk to accept online invoice payments."
      )
    }

    const dbSignature = await getUserEmailSignature(supabase, user.id)
    const letterheadLines = dbSignature
      ? dbSignature.split("\n").map((l) => l.trim()).filter(Boolean)
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

    if (!pdfBuffer.length) {
      throw new Error("Invoice PDF generation produced an empty file.")
    }

    const emailContent = buildInvoiceEmailContent({
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      dueDate: invoice.due_date,
      description: invoice.description,
      notes: invoice.notes,
      paymentUrl,
      senderName,
    })

    const signature = (body.signatureText?.trim() || dbSignature).trim()

    const textBody = appendSignatureToPlainText(emailContent.textBody, signature)
    const htmlBody = appendSignatureToHtml(emailContent.htmlBody, signature)

    const customAttachments = Array.isArray(body.attachments)
      ? body.attachments
          .filter((a) => a?.filename && a?.contentBase64)
          .map((a) => ({
            filename: String(a.filename),
            content: Buffer.from(String(a.contentBase64), "base64"),
            contentType: a.contentType || "application/octet-stream",
          }))
      : []
    const demoAttachments = await loadDemoReelAttachments(
      supabase,
      user.id,
      Array.isArray(body.demo_reel_ids) ? body.demo_reel_ids.map(String) : []
    )
    const mediaAttachments = await loadUserMediaAttachments(
      supabase,
      user.id,
      Array.isArray(body.user_media_ids) ? body.user_media_ids.map(String) : []
    )
    const allAttachments = [
      {
        filename: invoicePdfFilename(invoice.invoice_number),
        content: pdfBuffer,
        contentType: "application/pdf",
      },
      ...customAttachments,
      ...demoAttachments,
      ...mediaAttachments,
    ]
    const totalBytes = allAttachments.reduce((sum, a) => sum + a.content.length, 0)
    if (totalBytes > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Attachments exceed 25 MB total size limit" },
        { status: 400 }
      )
    }

    const sendResult = await sendEmailMessage(supabase, {
      userId: user.id,
      to: clientEmail,
      subject: emailContent.subject,
      text: textBody,
      html: htmlBody,
      accountId: body.account_id,
      attachments: allAttachments,
    })

    await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id)

    return NextResponse.json({
      success: true,
      paymentUrl,
      hasPaymentLink: Boolean(paymentUrl),
      pdfAttached: true,
      pdfBytes: pdfBuffer.length,
      warnings,
      ...sendResult,
    })
  } catch (err) {
    console.error("[invoices/send]", err)
    const message = err instanceof Error ? err.message : "Failed to send invoice"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
