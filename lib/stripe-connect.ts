import { getStripe, getStripeKeySource, getStripeMode } from "@/lib/stripe"
import type Stripe from "stripe"

export const CONNECT_CAPABILITIES: Stripe.AccountCreateParams.Capabilities = {
  card_payments: { requested: true },
  transfers: { requested: true },
}

/** User-facing message when the platform Stripe account has not enabled Connect yet. */
export function formatStripeConnectError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (
    message.includes("managing losses") ||
    message.includes("platform-profile")
  ) {
    return "Almost there: open the VOBizSuite Stripe Connect platform profile and review/accept responsibilities for connected-account losses, then try again. https://dashboard.stripe.com/settings/connect/platform-profile"
  }
  if (
    message.includes("Accounts v1") ||
    message.includes("feat_accounts_v1_support") ||
    message.includes("POST /v2/core/accounts")
  ) {
    return "Stripe requires Accounts v1 support for this Connect setup. In the VOBizSuite Stripe Dashboard (same test/live mode as your keys), enable Accounts v1 at dashboard.stripe.com/settings/features/feat_accounts_v1_support, then try again."
  }
  if (
    message.includes("signed up for Connect") ||
    message.includes("signed up for connect")
  ) {
    const source = getStripeKeySource()
    const mode = getStripeMode()
    const keyHint =
      source === "legacy"
        ? " Production is using STRIPE_SECRET_KEY (legacy sandbox). Set STRIPE_SECRET_KEY_VO in Vercel to your VOBizSuite secret key, or replace STRIPE_SECRET_KEY with the account where Connect is enabled."
        : " Enable Connect on the same Stripe account and mode (test vs live) as your Vercel secret key."
    return `Stripe Connect is not enabled for the Stripe account this site is using (${mode} mode).${keyHint} Dashboard: https://dashboard.stripe.com/connect`
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
      country: "US",
      email: params.email,
      capabilities: CONNECT_CAPABILITIES,
      business_type: "individual",
      controller: {
        stripe_dashboard: { type: "express" },
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
      },
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

export async function probePlatformStripeConnect(): Promise<{
  enabled: boolean
  error?: string
}> {
  const stripe = getStripe()
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      capabilities: CONNECT_CAPABILITIES,
      metadata: { connect_probe: "true" },
    })
    await stripe.accounts.del(account.id)
    return { enabled: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes("signed up for Connect") ||
      message.includes("signed up for connect")
    ) {
      return { enabled: false, error: message }
    }
    throw error
  }
}

export async function getPlatformStripeInfo() {
  const stripe = getStripe()
  const account = await stripe.accounts.retrieve()
  const connect = await probePlatformStripeConnect()
  return {
    accountId: account.id,
    displayName:
      account.settings?.dashboard?.display_name ||
      account.business_profile?.name ||
      null,
    country: account.country ?? null,
    connectEnabled: connect.enabled,
    connectError: connect.error ?? null,
    mode: getStripeMode(),
    keySource: getStripeKeySource(),
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
