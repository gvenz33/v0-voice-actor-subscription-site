"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
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
  Mic2,
  Sparkles,
  ScanSearch,
  Coins,
  Shield,
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
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
]

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

  const tierLabel =
    profile?.subscription_tier === "command"
      ? "Command"
      : profile?.subscription_tier === "momentum"
        ? "Momentum"
        : profile?.subscription_tier === "launch"
          ? "Launch"
          : "Free"

  return (
    <SidebarProvider>
      <Sidebar className="border-sidebar-border">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex flex-col gap-2">
            <Image 
              src="/images/vobizsuite-logo.png" 
              alt="VOBizSuite" 
              width={280} 
              height={70} 
              className="h-16 w-auto"
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
                      isActive={
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname.startsWith(item.href)
                      }
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

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-[family-name:var(--font-heading)] text-sm font-semibold text-foreground">
            {NAV_ITEMS.find(
              (item) =>
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
            )?.title ||
              (pathname.includes("settings") ? "Settings" : "VO Biz Suite")}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
