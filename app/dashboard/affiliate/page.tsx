"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, Check, Users, DollarSign, TrendingUp, Share2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

  useEffect(() => {
    async function loadAffiliateData() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's affiliate code
      const { data: profile } = await supabase
        .from("profiles")
        .select("affiliate_code")
        .eq("id", user.id)
        .single()

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
    if (stats?.affiliateCode) {
      navigator.clipboard.writeText(stats.affiliateCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyLink = () => {
    if (stats?.affiliateCode) {
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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading affiliate data...</div>
      </div>
    )
  }

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
