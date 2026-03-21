import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Mic, Users, LayoutDashboard, Settings, Shield, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Admin Console | VO Biz Suite",
  description: "Administrator console for managing users and system settings.",
}

const adminNavItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Settings", href: "/admin/settings", icon: Settings },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin or superadmin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("id", user.id)
    .single()

  // Allow access for superadmin email or if is_admin/is_superadmin is true
  const isSuperadminEmail = user.email === "gvenz33@gmail.com"
  if (!profile?.is_admin && !profile?.is_superadmin && !isSuperadminEmail) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Admin Console</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-2">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Mic className="h-4 w-4" />
                Back to App
              </Button>
            </Link>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
