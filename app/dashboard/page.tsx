"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, Send, CalendarCheck, Receipt, TrendingUp, Clock, MessageSquareHeart } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { monthStatuses, type BetaEnrollment, type BetaFeedbackSubmission } from "@/lib/beta-feedback-shared"
import { BETA_FEEDBACK_PROGRAM_CODES } from "@/lib/promo-codes"

async function fetchDashboardStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const [contacts, submissions, bookings, invoices, actionItems, touchpoints, enrollmentRes] =
    await Promise.all([
      supabase.from("contacts").select("id, status", { count: "exact" }).eq("user_id", user.id),
      supabase.from("submissions").select("id, status", { count: "exact" }).eq("user_id", user.id),
      supabase.from("bookings").select("id, status, rate_agreed", { count: "exact" }).eq("user_id", user.id),
      supabase.from("invoices").select("id, status, amount", { count: "exact" }).eq("user_id", user.id),
      supabase.from("action_items").select("id, status, title, due_date, priority").eq("user_id", user.id).eq("status", "todo").order("due_date", { ascending: true }).limit(5),
      supabase.from("touchpoints").select("id, status").eq("user_id", user.id).eq("status", "planned"),
      supabase
        .from("beta_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .in("promo_code", [...BETA_FEEDBACK_PROGRAM_CODES])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const activeBookings = bookings.data?.filter((b) => b.status !== "completed" && b.status !== "cancelled") || []
  const pendingInvoices = invoices.data?.filter((i) => i.status === "sent" || i.status === "overdue") || []
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
  const paidInvoices = invoices.data?.filter((i) => i.status === "paid") || []
  const earnedAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)

  let betaFeedback: { enrollment: BetaEnrollment; months: ReturnType<typeof monthStatuses> } | null = null
  if (enrollmentRes.data) {
    const { data: feedbackRows } = await supabase
      .from("beta_feedback_submissions")
      .select("month_number")
      .eq("enrollment_id", enrollmentRes.data.id)
    betaFeedback = {
      enrollment: enrollmentRes.data as BetaEnrollment,
      months: monthStatuses(
        enrollmentRes.data as BetaEnrollment,
        (feedbackRows as Pick<BetaFeedbackSubmission, "month_number">[]) ?? []
      ),
    }
  }

  return {
    totalContacts: contacts.count || 0,
    totalSubmissions: submissions.count || 0,
    activeBookings: activeBookings.length,
    pendingRevenue: pendingAmount,
    earnedRevenue: earnedAmount,
    upcomingActions: actionItems.data || [],
    plannedTouchpoints: touchpoints.count || 0,
    betaFeedback,
  }
}

export default function CommandCenter() {
  const { data: stats, isLoading } = useSWR("dashboard-stats", fetchDashboardStats)

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
            Command Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Your voice business at a glance.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-20 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: "Contacts",
      value: stats.totalContacts,
      icon: Users,
      href: "/dashboard/clients",
      description: "in your Client Hub",
      tint: "artist-card-indigo",
      iconClass: "text-artist-indigo",
    },
    {
      label: "Submissions",
      value: stats.totalSubmissions,
      icon: Send,
      href: "/dashboard/submissions",
      description: "auditions tracked",
      tint: "artist-card-coral",
      iconClass: "text-artist-coral",
    },
    {
      label: "Active Bookings",
      value: stats.activeBookings,
      icon: CalendarCheck,
      href: "/dashboard/bookings",
      description: "jobs in progress",
      tint: "artist-card-yellow",
      iconClass: "text-artist-yellow",
    },
    {
      label: "Pending Revenue",
      value: `$${stats.pendingRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: Receipt,
      href: "/dashboard/billing",
      description: "awaiting payment",
      tint: "artist-card-orange",
      iconClass: "text-artist-orange",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          Command Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Your voice business at a glance.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${stat.tint}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  {stat.label}
                </CardDescription>
                <stat.icon className={`size-4 ${stat.iconClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stats.betaFeedback && (
        <Link href="/dashboard/beta-feedback">
          <Card className="artist-card-green cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareHeart className="size-4 text-artist-green" />
                Beta Feedback Progress
              </CardTitle>
              <CardDescription>
                Active beta participation — one short feedback form each month for Month 1, 2, and 3.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {([1, 2, 3] as const).map((m) => (
                <div key={m} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">Month {m}: </span>
                  <Badge variant="outline" className="ml-1 capitalize">
                    {stats.betaFeedback!.months[m]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="artist-card-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-artist-green" />
              Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Earned</span>
                <span className="text-lg font-bold text-artist-green">
                  ${stats.earnedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-lg font-semibold text-artist-orange">
                  ${stats.pendingRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Planned Outreach</span>
                <span className="text-sm font-medium text-foreground">{stats.plannedTouchpoints} touchpoints</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="artist-card-coral">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-artist-coral" />
              Upcoming Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending action items. Add tasks to stay on top of your VO business.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.upcomingActions.map(
                  (item: { id: string; title: string; due_date: string | null; priority: string }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <span className="text-sm text-foreground truncate">{item.title}</span>
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5 ${
                          item.priority === "urgent"
                            ? "bg-destructive/10 text-destructive"
                            : item.priority === "high"
                              ? "bg-accent/20 text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
