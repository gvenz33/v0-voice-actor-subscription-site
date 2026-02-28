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
import { Users, Send, CalendarCheck, Receipt, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"

async function fetchDashboardStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const [contacts, submissions, bookings, invoices, actionItems, touchpoints] =
    await Promise.all([
      supabase.from("contacts").select("id, status", { count: "exact" }).eq("user_id", user.id),
      supabase.from("submissions").select("id, status", { count: "exact" }).eq("user_id", user.id),
      supabase.from("bookings").select("id, status, rate_agreed", { count: "exact" }).eq("user_id", user.id),
      supabase.from("invoices").select("id, status, amount", { count: "exact" }).eq("user_id", user.id),
      supabase.from("action_items").select("id, status, title, due_date, priority").eq("user_id", user.id).eq("status", "todo").order("due_date", { ascending: true }).limit(5),
      supabase.from("touchpoints").select("id, status").eq("user_id", user.id).eq("status", "planned"),
    ])

  const activeBookings = bookings.data?.filter((b) => b.status !== "completed" && b.status !== "cancelled") || []
  const pendingInvoices = invoices.data?.filter((i) => i.status === "sent" || i.status === "overdue") || []
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
  const paidInvoices = invoices.data?.filter((i) => i.status === "paid") || []
  const earnedAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)

  return {
    totalContacts: contacts.count || 0,
    totalSubmissions: submissions.count || 0,
    activeBookings: activeBookings.length,
    pendingRevenue: pendingAmount,
    earnedRevenue: earnedAmount,
    upcomingActions: actionItems.data || [],
    plannedTouchpoints: touchpoints.count || 0,
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
    },
    {
      label: "Submissions",
      value: stats.totalSubmissions,
      icon: Send,
      href: "/dashboard/submissions",
      description: "auditions tracked",
    },
    {
      label: "Active Bookings",
      value: stats.activeBookings,
      icon: CalendarCheck,
      href: "/dashboard/bookings",
      description: "jobs in progress",
    },
    {
      label: "Pending Revenue",
      value: `$${stats.pendingRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: Receipt,
      href: "/dashboard/billing",
      description: "awaiting payment",
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
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  {stat.label}
                </CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-accent" />
              Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Earned</span>
                <span className="text-lg font-bold text-foreground">
                  ${stats.earnedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-lg font-semibold text-accent">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-accent" />
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
