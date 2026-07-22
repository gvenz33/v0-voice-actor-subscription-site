import { getStripe } from "@/lib/stripe"

export async function createInvoicePaymentLink(params: {
  connectAccountId: string
  amount: number
  invoiceNumber: string
  description?: string | null
  invoiceId: string
  userId: string
}) {
  const stripe = getStripe()
  const amountCents = Math.round(params.amount * 100)

  if (amountCents < 50) {
    throw new Error("Invoice amount must be at least $0.50 to create a payment link.")
  }

  const account = await stripe.accounts.retrieve(params.connectAccountId)

  if (!account.charges_enabled) {
    throw new Error(
      "Your Stripe account is not ready to accept payments. Complete Stripe Connect setup under Billing Desk, then try again."
    )
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io"
  const invoiceQuery = encodeURIComponent(params.invoiceId)

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Invoice ${params.invoiceNumber}`,
              description:
                params.description?.trim() ||
                `Payment for invoice ${params.invoiceNumber}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/pay/success?invoice_id=${invoiceQuery}`,
      cancel_url: `${origin}/pay/cancel?invoice_id=${invoiceQuery}`,
      metadata: {
        payment_type: "invoice",
        invoice_id: params.invoiceId,
        user_id: params.userId,
        invoice_number: params.invoiceNumber,
      },
    },
    { stripeAccount: params.connectAccountId }
  )

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL for this invoice.")
  }

  return {
    id: session.id,
    url: session.url,
  }
}
