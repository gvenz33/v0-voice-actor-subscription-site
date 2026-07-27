"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  formatPaymentInstructionsForEmail,
  type InvoicePaymentProfile,
} from "@/lib/invoice-payment-instructions"
import {
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
} from "lucide-react"

async function fetchPaymentInstructions() {
  const res = await fetch("/api/billing/payment-instructions")
  if (!res.ok) throw new Error("Failed to load payment instructions")
  return res.json() as Promise<{ payment: InvoicePaymentProfile }>
}

type StripeConnectProps = {
  stripeStatus:
    | {
        configured?: boolean
        connected?: boolean
        detailsSubmitted?: boolean
        chargesEnabled?: boolean
        platformConnectEnabled?: boolean
        platformConnectError?: string | null
      }
    | undefined
  stripeReady: boolean
  platformConnectReady: boolean
  platformSetupMessage: string | null
  connectingStripe: boolean
  onConnectStripe: () => void
}

export function BillingGetPaidSection({
  stripeStatus,
  stripeReady,
  platformConnectReady,
  platformSetupMessage,
  connectingStripe,
  onConnectStripe,
}: StripeConnectProps) {
  const { data, mutate } = useSWR("billing-payment-instructions", fetchPaymentInstructions)
  const [form, setForm] = useState<InvoicePaymentProfile>({
    payment_zelle: "",
    payment_venmo: "",
    payment_paypal: "",
    payment_other: "",
  })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (data?.payment) {
      setForm({
        payment_zelle: data.payment.payment_zelle ?? "",
        payment_venmo: data.payment.payment_venmo ?? "",
        payment_paypal: data.payment.payment_paypal ?? "",
        payment_other: data.payment.payment_other ?? "",
      })
    }
  }, [data?.payment])

  const preview = useMemo(() => formatPaymentInstructionsForEmail(form), [form])

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)
    try {
      const res = await fetch("/api/billing/payment-instructions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Could not save")
      await mutate()
      setSaveMessage("Saved. These details are included when you email invoices to clients.")
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  const copyPreview = async () => {
    if (!preview.hasAny) return
    try {
      await navigator.clipboard.writeText(preview.textBlock)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div id="billing-get-paid" className="flex flex-col gap-4">
      <Card className="artist-card-violet ring-1 ring-artist-violet/25">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-artist-violet/20">
              <Banknote className="size-5 text-artist-violet" />
            </div>
            <div>
              <CardTitle className="text-base">Get paid on your invoices</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Use Zelle, Venmo, PayPal, or check/wire instructions today. Save your details once —
                they are added to invoice emails (and work even before online card checkout is live).
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_zelle" className="flex items-center gap-2">
                <Smartphone className="size-3.5 text-muted-foreground" />
                Zelle (email or mobile)
              </Label>
              <Input
                id="payment_zelle"
                placeholder="you@email.com or (555) 555-5555"
                value={form.payment_zelle ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, payment_zelle: e.target.value }))}
                className="min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">
                Ask clients to put your invoice number in the Zelle memo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_venmo">Venmo @username</Label>
              <Input
                id="payment_venmo"
                placeholder="@YourStudioName"
                value={form.payment_venmo ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, payment_venmo: e.target.value }))}
                className="min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">
                Venmo for Business is optional; many clients pay personal Venmo for small jobs.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_paypal">PayPal</Label>
              <Input
                id="payment_paypal"
                placeholder="paypal.me/you or billing@yourstudio.com"
                value={form.payment_paypal ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, payment_paypal: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment_other">Check, wire, or other instructions</Label>
              <Textarea
                id="payment_other"
                rows={3}
                placeholder="Make checks payable to… Mailing address… Wire routing (if you accept wires)…"
                value={form.payment_other ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, payment_other: e.target.value }))}
              />
            </div>
          </div>

          {preview.hasAny && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">Email preview</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyPreview()}>
                  <Copy className="mr-1.5 size-3.5" />
                  {copied ? "Copied" : "Copy text"}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                {preview.textBlock}
              </pre>
            </div>
          )}

          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
          {saveMessage && (
            <p className="text-sm text-artist-green">{saveMessage}</p>
          )}

          <Button
            type="button"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save payment instructions
          </Button>

          <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <li>• Confirm payment in your bank app before marking an invoice paid.</li>
            <li>• For agency clients, check/wire may still be required in their AP process.</li>
            <li>• Online card pay (Stripe) is coming — expand the section below when ready.</li>
          </ul>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="rounded-xl border border-border bg-card px-4">
        <AccordionItem value="stripe" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-1 items-center gap-3 text-left">
              <CreditCard className="size-4 shrink-0 text-artist-teal" />
              <div>
                <span className="font-medium">Stripe — card checkout on invoices</span>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    To be added
                  </Badge>
                  {stripeReady && (
                    <Badge variant="secondary" className="text-[10px]">
                      Account ready
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <Card id="get-paid-stripe" className="artist-card-teal ring-1 ring-artist-teal/30 border-0 shadow-none">
              <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                {!platformConnectReady && stripeStatus?.configured && platformSetupMessage && (
                  <Alert className="border-amber-500/40 bg-amber-500/10">
                    <AlertTitle>Finish Stripe platform setup</AlertTitle>
                    <AlertDescription className="text-sm">{platformSetupMessage}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  {stripeReady
                    ? "When live, clients can pay invoices online by card from the email pay link."
                    : "Connect Stripe so clients can pay invoices by card. Payouts go to your bank on Stripe's schedule."}
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Planned
                    </Badge>
                    <span>Card checkout on invoice pay links</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      To be added
                    </Badge>
                    <span>ACH / bank transfer payouts and payout reporting</span>
                  </li>
                </ul>
                {!stripeReady && (
                  <Button
                    type="button"
                    variant="success"
                    className="min-h-[44px] w-full sm:w-auto"
                    disabled={connectingStripe || stripeStatus === undefined}
                    onClick={onConnectStripe}
                  >
                    {connectingStripe ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : stripeStatus?.connected ? (
                      <CheckCircle2 className="mr-2 size-4" />
                    ) : (
                      <CreditCard className="mr-2 size-4" />
                    )}
                    {stripeStatus?.connected ? "Continue Stripe setup" : "Connect Stripe"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="plaid" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-1 items-center gap-3 text-left">
              <Landmark className="size-4 shrink-0 text-artist-indigo" />
              <div>
                <span className="font-medium">Plaid — bank-linked ACH payments</span>
                <Badge variant="outline" className="ml-2 text-[10px]">
                  To be added
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <Card className="artist-card-indigo ring-1 ring-artist-indigo/25 border-0 shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">
                  Link your bank with Plaid for ACH invoice payments and faster verification, alongside
                  Stripe card checkout when both are available.
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>Secure bank account linking for voice actors</li>
                  <li>ACH pay options on invoice emails</li>
                  <li>Balance and transfer status in Billing Desk</li>
                </ul>
                <Button type="button" variant="secondary" className="min-h-[44px] w-full sm:w-auto" disabled>
                  Coming soon
                </Button>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
