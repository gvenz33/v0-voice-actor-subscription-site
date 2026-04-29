import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminChrome } from "@/components/admin/admin-chrome"

export const metadata: Metadata = {
  title: "Admin Console | VO Biz Suite",
  description: "Administrator console for managing users and system settings.",
}

export default async function AdminLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("id", user.id)
    .single()

  const isSuperadminEmail = user.email === "gvenz33@gmail.com"
  if (!profile?.is_admin && !profile?.is_superadmin && !isSuperadminEmail) {
    redirect("/dashboard")
  }

  return <AdminChrome>{children}</AdminChrome>
}
