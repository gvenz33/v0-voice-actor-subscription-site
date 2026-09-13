"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Search, RefreshCw, Loader2, UserCog, Share2 } from "lucide-react"

interface AffiliateRow {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_tier: string
  feature_overrides: Record<string, unknown>
  affiliate_code: string | null
  stripe_connect_account_id: string | null
  is_admin: boolean
  is_superadmin: boolean
  created_at: string
  isEligible: boolean
  isDisabled: boolean
  commissionRate: number
  commissionPercentLabel: string
  referralCount: number
  activeReferralCount: number
  totalEarned: number
}

function displayName(row: AffiliateRow) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ")
  return name || row.business_name || row.email || row.id.slice(0, 8)
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [programEnabled, setProgramEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "eligible" | "with_code" | "disabled">("all")
  const [selected, setSelected] = useState<AffiliateRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [editAccess, setEditAccess] = useState<"default" | "enabled" | "disabled">("default")
  const [editCode, setEditCode] = useState("")
  const [editCommission, setEditCommission] = useState("")

  const fetchAffiliates = async () => {
    setLoading(true)
    setLoadError("")
    try {
      const res = await fetch("/api/admin/affiliates")
      const data = (await res.json()) as {
        affiliates?: AffiliateRow[]
        programEnabled?: boolean
        error?: string
      }
      if (!res.ok) {
        setAffiliates([])
        setLoadError(data.error || `Failed to load (${res.status})`)
        return
      }
      setAffiliates(data.affiliates ?? [])
      setProgramEnabled(data.programEnabled !== false)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAffiliates()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return affiliates.filter((a) => {
      if (filter === "eligible" && !a.isEligible) return false
      if (filter === "with_code" && !a.affiliate_code) return false
      if (filter === "disabled" && !a.isDisabled) return false
      if (!q) return true
      const hay = [
        a.email,
        a.first_name,
        a.last_name,
        a.business_name,
        a.affiliate_code,
        a.subscription_tier,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [affiliates, search, filter])

  const openEdit = (row: AffiliateRow) => {
    setSelected(row)
    const override = row.feature_overrides?.hasAffiliate
    setEditAccess(
      override === true || override === "true"
        ? "enabled"
        : override === false || override === "false"
          ? "disabled"
          : "default"
    )
    setEditCode(row.affiliate_code || "")
    const customRate = row.feature_overrides?.affiliateCommissionRate
    if (typeof customRate === "number") {
      setEditCommission(String(Math.round(customRate * 1000) / 10))
    } else if (typeof customRate === "string" && customRate) {
      const n = Number(customRate)
      setEditCommission(
        Number.isFinite(n) && n <= 1 ? String(Math.round(n * 1000) / 10) : String(customRate)
      )
    } else {
      setEditCommission("")
    }
    setMessage("")
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    setSaving(true)
    setMessage("")
    try {
      const payload: {
        userId: string
        hasAffiliate: boolean | null
        affiliateCode: string | null
        commissionPercent: number | null
      } = {
        userId: selected.id,
        hasAffiliate:
          editAccess === "default" ? null : editAccess === "enabled",
        affiliateCode: editCode.trim() ? editCode.trim().toUpperCase() : null,
        commissionPercent: null,
      }

      if (editCommission.trim() !== "") {
        const pct = Number(editCommission)
        if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
          throw new Error("Commission override must be between 0 and 100.")
        }
        payload.commissionPercent = pct
      }

      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      setMessage("Affiliate updated.")
      setEditOpen(false)
      await fetchAffiliates()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const withCode = affiliates.filter((a) => a.affiliate_code).length
    const eligible = affiliates.filter((a) => a.isEligible).length
    const referrals = affiliates.reduce((sum, a) => sum + a.referralCount, 0)
    return { withCode, eligible, referrals, total: affiliates.length }
  }, [affiliates])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Affiliates</h1>
          <p className="text-sm text-muted-foreground">
            Manage affiliate access, codes, and commission rates the same way you manage users.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={() => void fetchAffiliates()}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          Refresh
        </Button>
      </div>

      {!programEnabled && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-amber-800 dark:text-amber-200">
            The affiliate program is currently disabled site-wide in Settings. Affiliates below
            will not earn until it is turned back on.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Users</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Eligible</p>
            <p className="text-2xl font-bold">{stats.eligible}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">With code</p>
            <p className="text-2xl font-bold">{stats.withCode}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Referrals</p>
            <p className="text-2xl font-bold">{stats.referrals}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="size-4" />
            Affiliate directory
          </CardTitle>
          <CardDescription>
            Free accounts earn 8% by default; paid plans earn 20%. You can override either.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or code…"
                className="min-h-[44px] pl-9"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="eligible">Eligible only</SelectItem>
                <SelectItem value="with_code">With code</SelectItem>
                <SelectItem value="disabled">Access disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadError && <p className="text-sm text-destructive">{loadError}</p>}
          {message && !editOpen && <p className="text-sm text-artist-green">{message}</p>}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading affiliates…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No affiliates match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{displayName(row)}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {row.subscription_tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.affiliate_code || "—"}
                        </TableCell>
                        <TableCell>{row.commissionPercentLabel}</TableCell>
                        <TableCell>
                          {row.referralCount}
                          {row.activeReferralCount > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              ({row.activeReferralCount} active)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>${Number(row.totalEarned || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {row.isDisabled ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : row.isEligible ? (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                              Eligible
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Locked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(row)}
                          >
                            <UserCog className="mr-1.5 size-3.5" />
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage affiliate</DialogTitle>
            <DialogDescription>
              {selected ? displayName(selected) : ""} — edit access, referral code, and commission.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Email:</span> {selected.email || "—"}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Plan:</span>{" "}
                  <span className="capitalize">{selected.subscription_tier}</span>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Default rate:</span>{" "}
                  {selected.subscription_tier === "free" ? "8%" : "20%"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Affiliate access</Label>
                <Select
                  value={editAccess}
                  onValueChange={(v) => setEditAccess(v as typeof editAccess)}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use tier default (enabled)</SelectItem>
                    <SelectItem value="enabled">Force enable</SelectItem>
                    <SelectItem value="disabled">Force disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aff_code">Affiliate code</Label>
                <Input
                  id="aff_code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="min-h-[44px] font-mono"
                  placeholder="Leave blank to clear"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aff_rate">Commission override (%)</Label>
                <Input
                  id="aff_rate"
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                  className="min-h-[44px]"
                  placeholder="Blank = tier default (8% free / 20% paid)"
                />
              </div>

              {message && <p className="text-sm text-destructive">{message}</p>}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveEdit()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
