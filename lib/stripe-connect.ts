import { getStripe } from "@/lib/stripe"
import type Stripe from "stripe"

export const CONNECT_CAPABILITIES: Stripe.AccountCreateParams.Capabilities = {
  card_payments: { requested: true },
  transfers: { requested: true },
}

/** User-facing message when the platform Stripe account has not enabled Connect yet. */
export function formatStripeConnectError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (
    message.includes("signed up for Connect") ||
    message.includes("signed up for connect")
  ) {
    return "Stripe Connect is not enabled on the VO Biz Suite Stripe account yet. The site owner must complete Connect setup at dashboard.stripe.com/connect (enable Express accounts), then try again."
  }
  return message || "Failed to connect Stripe"
}

export async function ensureStripeConnectAccount(params: {
  userId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  existingAccountId?: string | null
}): Promise<string> {
  const stripe = getStripe()
  let accountId = params.existingAccountId ?? null

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: params.email,
      capabilities: CONNECT_CAPABILITIES,
      business_type: "individual",
      individual: {
        first_name: params.firstName || undefined,
        last_name: params.lastName || undefined,
        email: params.email,
      },
      metadata: {
        user_id: params.userId,
      },
    })
    accountId = account.id
  } else {
    await stripe.accounts.update(accountId, {
      capabilities: CONNECT_CAPABILITIES,
    })
  }

  return accountId
}

export async function getStripeConnectStatus(connectAccountId: string | null | undefined) {
  if (!connectAccountId) {
    return {
      connected: false,
      accountId: null as string | null,
      chargesEnabled: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
    }
  }

  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(connectAccountId)

  return {
    connected: true,
    accountId: connectAccountId,
    chargesEnabled: account.charges_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
  }
}

export async function createStripeConnectOnboardingLink(params: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}) {
  const stripe = getStripe()
  const accountLink = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  })
  return accountLink.url
}
