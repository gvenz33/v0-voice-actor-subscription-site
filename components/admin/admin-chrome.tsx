"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Mic,
  Users,
  LayoutDashboard,
  Settings,
  Shield,
  LogOut,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const adminNavItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Settings", href: "/admin/settings", icon: Settings },
] as const

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void
  className?: string
}) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {adminNavItems.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-64 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top,0px)]">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Admin Console</span>
          </div>
          <NavLinks className="flex-1 p-4" />
          <div className="space-y-2 border-t border-border p-4">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Mic className="h-4 w-4" />
                Back to App
              </Button>
            </Link>
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md md:hidden pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-14 items-center gap-3 px-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Open admin menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(100vw-2rem,20rem)] flex-col gap-0 p-0"
          >
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <SheetTitle className="font-semibold">Admin Console</SheetTitle>
              </div>
            </SheetHeader>
            <NavLinks
              className="flex-1 overflow-y-auto p-4"
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="mt-auto space-y-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Mic className="h-4 w-4" />
                  Back to App
                </Button>
              </Link>
              <form action="/auth/signout" method="post">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
        <span className="truncate font-semibold text-foreground">Admin</span>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] md:ml-64 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  )
}
