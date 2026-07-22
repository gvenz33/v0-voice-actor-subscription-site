"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { getTierDisplayLabel } from "@/lib/subscription-tier"
import { getEffectiveSubscriptionTier } from "@/lib/affiliate-context"
import Image from "next/image"
import type { User } from "@supabase/supabase-js"
import {
  LayoutDashboard,
  Users,
  Send,
  CalendarCheck,
  Receipt,
  MessageSquare,
  CheckSquare,
  Settings,
  LogOut,
  Sparkles,
  ScanSearch,
  Coins,
  Shield,
  Gift,
  BookText,
  Mail,
  Calendar,
  FileText,
  Menu,
  MessageSquareHeart,
} from "lucide-react"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_tier: string
  experience_level: string | null
  is_admin?: boolean
  is_superadmin?: boolean
}

const NAV_ITEMS = [
  {
    title: "Command Center",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Inbox",
    href: "/dashboard/inbox",
    icon: Mail,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    title: "Script counter",
    href: "/dashboard/script-tools",
    icon: FileText,
  },
  {
    title: "Client Hub",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    title: "Submissions",
    href: "/dashboard/submissions",
    icon: Send,
  },
  {
    title: "Bookings",
    href: "/dashboard/bookings",
    icon: CalendarCheck,
  },
  {
    title: "Billing Desk",
    href: "/dashboard/billing",
    icon: Receipt,
  },
  {
    title: "Voice Over Rate Guide",
    href: "/dashboard/rate-guide",
    icon: BookText,
  },
  {
    title: "Touchpoints",
    href: "/dashboard/touchpoints",
    icon: MessageSquare,
  },
  {
    title: "Action Items",
    href: "/dashboard/actions",
    icon: CheckSquare,
  },
  {
    title: "Prospect Finder",
    href: "/dashboard/prospect-finder",
    icon: ScanSearch,
  },
  {
    title: "AI Tools",
    href: "/dashboard/ai-tools",
    icon: Sparkles,
  },
  {
    title: "Tokens",
    href: "/dashboard/tokens",
    icon: Coins,
  },
  {
    title: "Affiliate",
    href: "/dashboard/affiliate",
    icon: Gift,
  },
  {
    title: "Beta Feedback",
    href: "/dashboard/beta-feedback",
    icon: MessageSquareHeart,
  },
]

/** Primary routes shown in the mobile bottom tab bar (must exist in NAV_ITEMS). */
const MOBILE_TAB_HREFS = [
  "/dashboard",
  "/dashboard/inbox",
  "/dashboard/calendar",
  "/dashboard/clients",
] as const

const MOBILE_TAB_ITEMS = MOBILE_TAB_HREFS.map((href) => {
  const item = NAV_ITEMS.find((n) => n.href === href)
  if (!item) throw new Error(`Missing NAV_ITEMS entry for ${href}`)
  return item
})

const MOBILE_TAB_LABELS: Record<(typeof MOBILE_TAB_HREFS)[number], string> = {
  "/dashboard": "Home",
  "/dashboard/inbox": "Inbox",
  "/dashboard/calendar": "Calendar",
  "/dashboard/clients": "Clients",
}

function navItemIsActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href)
}

function DashboardMobileTabBar() {
  const pathname = usePathname()
  const { setOpenMobile, openMobile } = useSidebar()

  const onPrimaryTab = MOBILE_TAB_ITEMS.some((item) =>
    navItemIsActive(pathname, item.href)
  )
  const moreActive = !onPrimaryTab

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md md:hidden"
      aria-label="App navigation"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-between gap-0.5 px-1">
        {MOBILE_TAB_ITEMS.map((item) => {
          const active = navItemIsActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (openMobile) setOpenMobile(false)
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-muted-foreground transition-colors",
                active &&
                  "bg-primary/15 text-primary"
              )}
            >
              <item.icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
              <span className="max-w-full truncate text-[10px] font-medium leading-none">
                {MOBILE_TAB_LABELS[item.href as keyof typeof MOBILE_TAB_LABELS]}
              </span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-muted-foreground transition-colors",
            moreActive && "bg-muted/80 text-foreground"
          )}
          aria-label="Open full menu"
        >
          <Menu className="size-5 shrink-0" strokeWidth={moreActive ? 2.25 : 2} />
          <span className="max-w-full truncate text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  )
}

export function DashboardShell({
  user,
  profile,
  children,
}: {
  user: User
  profile: Profile | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const displayName =
    profile?.first_name
      ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
      : user.email?.split("@")[0] || "Voice Artist"

  const tierLabel = getTierDisplayLabel(
    getEffectiveSubscriptionTier(
      profile?.subscription_tier,
      user.email,
      profile?.is_superadmin
    )
  )

  return (
    <SidebarProvider>
      <Sidebar className="border-sidebar-border">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex flex-col gap-2">
            <Image 
              src="/images/vobizsuite-logo-cropped.png" 
              alt="VOBizSuite" 
              width={220} 
              height={55} 
              className="h-9 w-auto mix-blend-lighten"
            />
            <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              {tierLabel} Plan
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={navItemIsActive(pathname, item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {/* Show Admin Console link for superadmin email or if is_admin/is_superadmin is true */}
            {(profile?.is_admin === true || profile?.is_superadmin === true || user.email === "gvenz33@gmail.com") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Admin Console">
                  <Link href="/admin" className="text-red-500 hover:text-red-400">
                    <Shield className="text-red-500" />
                    <span>Admin Console</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="/dashboard/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sign Out"
                onClick={handleSignOut}
              >
                <LogOut />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator className="my-1" />
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col truncate">
              <span className="truncate text-xs font-medium text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-[10px] text-sidebar-foreground/60">
                {user.email}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="page-artist min-h-dvh">
        <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-14 min-h-14 w-full items-center gap-2">
          <SidebarTrigger className="-ml-1 size-10 shrink-0 md:size-7" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-[family-name:var(--font-heading)] text-sm font-semibold text-foreground">
            {NAV_ITEMS.find((item) => navItemIsActive(pathname, item.href))?.title ||
              (pathname.includes("settings") ? "Settings" : "VO Biz Suite")}
          </h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 pb-[calc(env(safe-area-inset-bottom,0px)+4.25rem)] md:p-6 md:pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </SidebarInset>
      <DashboardMobileTabBar />
    </SidebarProvider>
  )
}
