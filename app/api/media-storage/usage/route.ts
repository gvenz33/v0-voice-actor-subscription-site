import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStorageUsageSnapshot } from "@/lib/media-storage-server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle()

    const usage = await getStorageUsageSnapshot(
      supabase,
      user.id,
      profile?.subscription_tier
    )

    return NextResponse.json(usage)
  } catch (error) {
    console.error("[media-storage/usage]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load storage" },
      { status: 500 }
    )
  }
}
