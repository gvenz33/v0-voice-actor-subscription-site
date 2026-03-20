import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, TrendingUp, AlertCircle } from "lucide-react"

async function getAdminStats() {
  const supabase = await createClient()
  
  // Get total users count
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  // Get users by tier
  const { data: tierData } = await supabase
    .from("profiles")
    .select("subscription_tier")
  
  const tierCounts = tierData?.reduce((acc, user) => {
    const tier = user.subscription_tier || "free"
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Get recent signups (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { count: recentSignups } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString())

  return {
    totalUsers: totalUsers || 0,
    tierCounts,
    recentSignups: recentSignups || 0,
    paidUsers: (tierCounts.launch || 0) + (tierCounts.momentum || 0) + (tierCounts.command || 0),
  }
}

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your VO Biz Suite platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentSignups}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Free Tier</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tierCounts.free || 0}</div>
            <p className="text-xs text-muted-foreground">
              Potential upgrades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tiers</CardTitle>
          <CardDescription>Distribution of users across subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["free", "launch", "momentum", "command"].map((tier) => {
              const count = stats.tierCounts[tier] || 0
              const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
              return (
                <div key={tier} className="flex items-center gap-4">
                  <div className="w-24 capitalize font-medium">{tier}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm text-muted-foreground">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
