import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ensureUserProfile } from "@/lib/ensure-user-profile"
import { getTrialStatus } from "@/lib/trial"
import { TrialBanner } from "@/components/dashboard/trial-banner"

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your voice acting business - track auditions, clients, invoices, and grow your career with AI-powered tools.",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  await ensureUserProfile(user)

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const trial = getTrialStatus(profile)

  return (
    <DashboardShell user={user} profile={profile}>
      <TrialBanner trial={trial} />
      {children}
    </DashboardShell>
  )
}
