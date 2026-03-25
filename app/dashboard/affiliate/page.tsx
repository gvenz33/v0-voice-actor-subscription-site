"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, Check, Users, DollarSign, TrendingUp, Share2, Crown, Lock, CreditCard, Wallet, ArrowRight, Loader2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface AffiliateStats {
  affiliateCode: string
  totalReferrals: number
  activeReferrals: number
  totalEarned: number
  pendingEarnings: number
}

interface Referral {
  id: string
  referred_user_id: string
  status: string
  total_earned: number
  created_at: string
  referred_user?: {
    first_name: string | null
    last_name: string | null
    subscription_tier: string
  }
}

export default function AffiliatePage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [isEligible, setIsEligible] = useState(false)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<"stripe" | "credit">("stripe")
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [payoutMessage, setPayoutMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)

  useEffect(() => {
    async function loadAffiliateData() {
      const supabase = createClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log("[v0] Auth error or no user:", userError)
        setLoading(false)
        return
      }

      // Get user's affiliate code, subscription tier, feature overrides, and stripe account
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("affiliate_code, subscription_tier, feature_overrides, stripe_connect_account_id")
        .eq("id", user.id)
        .single()

      console.log("[v0] Profile data:", JSON.stringify(profile, null, 2))
      console.log("[v0] Profile error:", profileError)

      // Check if user has connected Stripe account
      if (profile?.stripe_connect_account_id) {
        setStripeConnected(true)
        setStripeAccountId(profile.stripe_connect_account_id)
      }

      const tier = profile?.subscription_tier || "free"
      setSubscriptionTier(tier)
      console.log("[v0] Subscription tier:", tier)
      
      // Check eligibility: tier-based (momentum, command) OR admin override
      // Parse feature_overrides - it may come as string or object depending on DB
      let overrides: Record<string, unknown> = {}
      if (profile?.feature_overrides) {
        if (typeof profile.feature_overrides === "string") {
          try {
            overrides = JSON.parse(profile.feature_overrides)
          } catch {
            overrides = {}
          }
        } else {
          overrides = profile.feature_overrides as Record<string, unknown>
        }
      }
      
      console.log("[v0] Feature overrides:", JSON.stringify(overrides, null, 2))
      
      const tierEligible = ["momentum", "command"].includes(tier)
      const hasOverride = overrides.hasAffiliate === true
      const isDisabled = overrides.hasAffiliate === false
      const eligible = (tierEligible || hasOverride) && !isDisabled
      
      console.log("[v0] Tier eligible:", tierEligible, "| Override:", hasOverride, "| Disabled:", isDisabled, "| Final eligible:", eligible)
      
      setIsEligible(eligible)

      // Get referrals
      const { data: referralData } = await supabase
        .from("affiliate_referrals")
        .select(`
          id,
          referred_user_id,
          status,
          total_earned,
          created_at
        `)
        .eq("affiliate_user_id", user.id)
        .order("created_at", { ascending: false })

      const totalReferrals = referralData?.length || 0
      const activeReferrals = referralData?.filter(r => r.status === "active").length || 0
      const totalEarned = referralData?.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.total_earned || 0), 0) || 0
      const pendingEarnings = referralData?.filter(r => r.status === "active").reduce((sum, r) => sum + (r.total_earned || 0), 0) || 0

      setStats({
        affiliateCode: profile?.affiliate_code || "",
        totalReferrals,
        activeReferrals,
        totalEarned,
        pendingEarnings
      })

      setReferrals(referralData || [])
      setLoading(false)
    }

    loadAffiliateData()
  }, [])

  const copyCode = () => {
    if (stats?.affiliateCode && isEligible) {
      navigator.clipboard.writeText(stats.affiliateCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyLink = () => {
    if (stats?.affiliateCode && isEligible) {
      const link = `${window.location.origin}/auth/sign-up?ref=${stats.affiliateCode}`
      navigator.clipboard.writeText(link)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400">Active</Badge>
      case "paid":
        return <Badge className="bg-blue-500/20 text-blue-400">Paid</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "free": return "Free"
      case "launch": return "Launch"
      case "momentum": return "Momentum"
      case "command": return "Command"
      default: return tier
    }
  }

  const handleRequestPayout = async () => {
    if (!stats?.pendingEarnings || stats.pendingEarnings <= 0) {
      setPayoutMessage({ type: "error", text: "No pending earnings to withdraw" })
      return
    }

    setRequestingPayout(true)
    setPayoutMessage(null)

    try {
      const response = await fetch("/api/affiliate/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: stats.pendingEarnings,
          method: payoutMethod,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to request payout")
      }

      setPayoutMessage({ 
        type: "success", 
        text: payoutMethod === "credit" 
          ? `$${stats.pendingEarnings.toFixed(2)} has been applied as credit to your subscription!`
          : `Payout of $${stats.pendingEarnings.toFixed(2)} has been initiated to your Stripe account!`
      })

      // Refresh stats
      setStats(prev => prev ? { ...prev, pendingEarnings: 0, totalEarned: prev.totalEarned + prev.pendingEarnings } : null)
      
      setTimeout(() => {
        setPayoutDialogOpen(false)
        setPayoutMessage(null)
      }, 3000)
    } catch (error) {
      setPayoutMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to request payout" 
      })
    } finally {
      setRequestingPayout(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      const response = await fetch("/api/affiliate/connect-stripe", {
        method: "POST",
      })
      const result = await response.json()
      
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error("Failed to connect Stripe:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading affiliate data...</div>
      </div>
    )
  }

  // Locked state for Free and Launch tiers
  if (!isEligible) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Program</h1>
          <p className="mt-1 text-muted-foreground">
            Earn 20% commission on every subscription from your referrals
          </p>
        </div>

        {/* Locked Card */}
        <Card className="relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-transparent to-yellow-500/10">
          <div className="absolute right-4 top-4">
            <Crown className="h-16 w-16 text-yellow-500/20" />
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                <Lock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Unlock Affiliate Referrals
                  <Crown className="h-5 w-5 text-yellow-500" />
                </CardTitle>
                <CardDescription>
                  Available with Momentum or Command subscription
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              You&apos;re currently on the <Badge variant="outline" className="mx-1">{getTierLabel(subscriptionTier)}</Badge> plan. 
              Upgrade to <span className="font-semibold text-yellow-500">Momentum</span> or <span className="font-semibold text-yellow-500">Command</span> to 
              unlock your unique affiliate code and start earning 20% commission on every referral.
            </p>

            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <h3 className="mb-3 font-semibold">What you&apos;ll unlock:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Unique referral code: <span className="font-mono text-foreground/50">VOB••••••••</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Shareable referral link
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  20% commission on all referral subscriptions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Lifetime commissions for as long as they subscribe
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Monthly payouts via PayPal or bank transfer
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400">
                <Link href="/dashboard/settings">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Momentum - $49/mo
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 border-yellow-500/30 hover:bg-yellow-500/10">
                <Link href="/dashboard/settings">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Command - $99/mo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How It Works (visible to all) */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
                <h3 className="font-semibold">Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  Share your unique referral link with other voice actors through social media, email, or word of mouth.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
                <h3 className="font-semibold">They Subscribe</h3>
                <p className="text-sm text-muted-foreground">
                  When someone signs up using your link and subscribes to any paid plan, you start earning commissions.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
                <h3 className="font-semibold">Earn 20%</h3>
                <p className="text-sm text-muted-foreground">
                  Earn 20% of their subscription fee for as long as they remain a paying customer. Payouts are processed monthly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Full affiliate dashboard for eligible tiers
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Affiliate Program</h1>
        <p className="mt-1 text-muted-foreground">
          Earn 20% commission on every subscription from your referrals
        </p>
      </div>

      {/* Affiliate Link Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Your Affiliate Link
          </CardTitle>
          <CardDescription>
            Share this link with other voice actors. When they sign up and subscribe, you earn 20% of their subscription fee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Referral Code</label>
              <div className="flex gap-2">
                <Input 
                  value={stats?.affiliateCode || ""} 
                  readOnly 
                  className="font-mono text-lg"
                />
                <Button variant="outline" size="icon" onClick={copyCode}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Referral Link</label>
              <div className="flex gap-2">
                <Input 
                  value={stats?.affiliateCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/sign-up?ref=${stats.affiliateCode}` : ""} 
                  readOnly 
                  className="text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">All time signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">Currently paying</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.totalEarned || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">${(stats?.pendingEarnings || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Options */}
      {(stats?.pendingEarnings || 0) > 0 && (
        <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              Withdraw Your Earnings
            </CardTitle>
            <CardDescription>
              You have ${(stats?.pendingEarnings || 0).toFixed(2)} available for withdrawal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-500">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Request Payout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Withdraw Earnings</DialogTitle>
                  <DialogDescription>
                    Choose how you would like to receive your ${(stats?.pendingEarnings || 0).toFixed(2)} in earnings
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <RadioGroup value={payoutMethod} onValueChange={(v) => setPayoutMethod(v as "stripe" | "credit")}>
                    <div className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${payoutMethod === "stripe" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                      onClick={() => setPayoutMethod("stripe")}>
                      <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer font-medium">
                          <CreditCard className="h-4 w-4" />
                          Send to Bank Account
                        </Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Transfer to your connected Stripe account. Funds typically arrive within 2-3 business days.
                        </p>
                        {!stripeConnected && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleConnectStripe()
                            }}
                          >
                            Connect Stripe Account
                          </Button>
                        )}
                        {stripeConnected && (
                          <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Stripe account connected
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${payoutMethod === "credit" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                      onClick={() => setPayoutMethod("credit")}>
                      <RadioGroupItem value="credit" id="credit" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="credit" className="flex items-center gap-2 cursor-pointer font-medium">
                          <Wallet className="h-4 w-4" />
                          Apply as Subscription Credit
                        </Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Use your earnings to pay for your VO Biz Suite subscription. Credit is applied immediately.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Current balance: ${(stats?.pendingEarnings || 0).toFixed(2)} covers ~{Math.floor((stats?.pendingEarnings || 0) / 49)} months of Momentum
                        </p>
                      </div>
                    </div>
                  </RadioGroup>

                  {payoutMessage && (
                    <div className={`rounded-lg p-3 text-sm ${payoutMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {payoutMessage.text}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setPayoutDialogOpen(false)} 
                    className="flex-1"
                    disabled={requestingPayout}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRequestPayout} 
                    className="flex-1 bg-green-600 hover:bg-green-500"
                    disabled={requestingPayout || (payoutMethod === "stripe" && !stripeConnected)}
                  >
                    {requestingPayout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm Payout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Commission Info */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
              <h3 className="font-semibold">Share Your Link</h3>
              <p className="text-sm text-muted-foreground">
                Share your unique referral link with other voice actors through social media, email, or word of mouth.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
              <h3 className="font-semibold">They Subscribe</h3>
              <p className="text-sm text-muted-foreground">
                When someone signs up using your link and subscribes to any paid plan, you start earning commissions.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
              <h3 className="font-semibold">Earn 20%</h3>
              <p className="text-sm text-muted-foreground">
                Earn 20% of their subscription fee for as long as they remain a paying customer. Payouts are processed monthly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Track all users who signed up with your referral code</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No referrals yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your affiliate link to start earning commissions
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>{formatDate(referral.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(referral.total_earned || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
