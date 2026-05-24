"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  formatPromoDiscount,
  PAID_TIER_IDS,
  TIER_MARKETING_NAMES,
  type PromoCodeRecord,
} from "@/lib/promo-codes"

type PromoFormState = {
  code: string
  description: string
  discount_type: "percent" | "fixed"
  discount_value: string
  applies_to_tiers: string[]
  billing_interval_restriction: "month" | "year" | "any"
  requires_feedback_acknowledgement: boolean
  max_redemptions: string
  valid_from: string
  valid_until: string
  active: boolean
}

const emptyForm = (): PromoFormState => ({
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "10",
  applies_to_tiers: [],
  billing_interval_restriction: "any",
  requires_feedback_acknowledgement: false,
  max_redemptions: "",
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: "",
  active: true,
})

function formFromPromo(promo: PromoCodeRecord): PromoFormState {
  return {
    code: promo.code,
    description: promo.description ?? "",
    discount_type: promo.discount_type,
    discount_value:
      promo.discount_type === "fixed"
        ? String(promo.discount_value / 100)
        : String(promo.discount_value),
    applies_to_tiers: promo.applies_to_tiers ?? [],
    billing_interval_restriction: promo.billing_interval_restriction,
    requires_feedback_acknowledgement: promo.requires_feedback_acknowledgement,
    max_redemptions: promo.max_redemptions != null ? String(promo.max_redemptions) : "",
    valid_from: promo.valid_from.slice(0, 16),
    valid_until: promo.valid_until ? promo.valid_until.slice(0, 16) : "",
    active: promo.active,
  }
}

function payloadFromForm(form: PromoFormState) {
  return {
    code: form.code,
    description: form.description || null,
    discount_type: form.discount_type,
    discount_value:
      form.discount_type === "fixed"
        ? Math.round(Number(form.discount_value) * 100)
        : Number(form.discount_value),
    applies_to_tiers: form.applies_to_tiers,
    billing_interval_restriction: form.billing_interval_restriction,
    requires_feedback_acknowledgement: form.requires_feedback_acknowledgement,
    max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
    valid_from: new Date(form.valid_from).toISOString(),
    valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
    active: form.active,
  }
}

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PromoCodeRecord | null>(null)
  const [form, setForm] = useState<PromoFormState>(emptyForm())

  const fetchPromoCodes = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/promo-codes")
      const data = (await res.json()) as { promoCodes?: PromoCodeRecord[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to load promo codes")
      setPromoCodes(data.promoCodes ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promo codes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPromoCodes()
  }, [fetchPromoCodes])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (promo: PromoCodeRecord) => {
    setEditing(promo)
    setForm(formFromPromo(promo))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const payload = payloadFromForm(form)
      const res = await fetch(
        editing ? `/api/admin/promo-codes/${editing.id}` : "/api/admin/promo-codes",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to save promo code")

      setMessage(editing ? "Promo code updated." : "Promo code created.")
      setDialogOpen(false)
      await fetchPromoCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promo code")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (promo: PromoCodeRecord) => {
    if (!confirm(`Delete promo code ${promo.code}?`)) return

    setError("")
    try {
      const res = await fetch(`/api/admin/promo-codes/${promo.id}`, { method: "DELETE" })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to delete promo code")
      setMessage(`Deleted ${promo.code}.`)
      await fetchPromoCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete promo code")
    }
  }

  const toggleTier = (tier: string) => {
    setForm((prev) => ({
      ...prev,
      applies_to_tiers: prev.applies_to_tiers.includes(tier)
        ? prev.applies_to_tiers.filter((t) => t !== tier)
        : [...prev.applies_to_tiers, tier],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promo Codes</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage subscription promo codes, beta offers, and redemption limits.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchPromoCodes()} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            New Promo Code
          </Button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={
            error
              ? "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              : "rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400"
          }
        >
          {error || message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="size-5" />
            Active & Scheduled Codes
          </CardTitle>
          <CardDescription>
            The seeded <span className="font-mono">BETA</span> code gives 50% off Pro and Enterprise annual plans with a feedback agreement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : promoCodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No promo codes yet. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono font-semibold">{promo.code}</TableCell>
                      <TableCell>{formatPromoDiscount(promo)}</TableCell>
                      <TableCell className="max-w-[180px] text-xs">
                        {promo.applies_to_tiers.length
                          ? promo.applies_to_tiers
                              .map((t) => TIER_MARKETING_NAMES[t as keyof typeof TIER_MARKETING_NAMES] ?? t)
                              .join(", ")
                          : "All paid plans"}
                      </TableCell>
                      <TableCell className="capitalize">{promo.billing_interval_restriction}</TableCell>
                      <TableCell>
                        {promo.redemption_count}
                        {promo.max_redemptions != null ? ` / ${promo.max_redemptions}` : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{new Date(promo.valid_from).toLocaleDateString()}</div>
                        {promo.valid_until && (
                          <div>→ {new Date(promo.valid_until).toLocaleDateString()}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promo.active ? "default" : "secondary"}>
                          {promo.active ? "Active" : "Inactive"}
                        </Badge>
                        {promo.requires_feedback_acknowledgement && (
                          <Badge variant="outline" className="ml-1">Beta</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(promo)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void handleDelete(promo)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
            <DialogDescription>
              Fixed-amount discounts are entered in dollars. Percent discounts are 1–100.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="BETA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(value: "percent" | "fixed") =>
                    setForm((f) => ({ ...f, discount_type: value }))
                  }
                >
                  <SelectTrigger id="discount_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="fixed">Fixed amount off (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Beta launch offer"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  {form.discount_type === "percent" ? "Percent Off" : "Amount Off (USD)"}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step={form.discount_type === "percent" ? "1" : "0.01"}
                  value={form.discount_value}
                  onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_redemptions">Max Redemptions (optional)</Label>
                <Input
                  id="max_redemptions"
                  type="number"
                  min="1"
                  value={form.max_redemptions}
                  onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applies to plans</Label>
              <p className="text-xs text-muted-foreground">Leave all unchecked to apply to every paid plan.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAID_TIER_IDS.map((tier) => (
                  <label key={tier} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Checkbox
                      checked={form.applies_to_tiers.includes(tier)}
                      onCheckedChange={() => toggleTier(tier)}
                    />
                    {TIER_MARKETING_NAMES[tier]}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_interval">Billing interval restriction</Label>
              <Select
                value={form.billing_interval_restriction}
                onValueChange={(value: "month" | "year" | "any") =>
                  setForm((f) => ({ ...f, billing_interval_restriction: value }))
                }
              >
                <SelectTrigger id="billing_interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any interval</SelectItem>
                  <SelectItem value="year">Annual only</SelectItem>
                  <SelectItem value="month">Monthly only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Starts</Label>
                <Input
                  id="valid_from"
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Ends (optional)</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Beta / feedback agreement required</Label>
                <p className="text-xs text-muted-foreground">
                  Shows disclaimer and requires acknowledgement before checkout.
                </p>
              </div>
              <Switch
                checked={form.requires_feedback_acknowledgement}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, requires_feedback_acknowledgement: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.code.trim()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editing ? "Save Changes" : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
