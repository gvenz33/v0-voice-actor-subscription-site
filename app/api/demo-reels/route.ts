import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listUserDemoReels } from "@/lib/demo-reels-server"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const reels = await listUserDemoReels(supabase, user.id)
    return NextResponse.json({ reels })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load demo reels" },
      { status: 500 }
    )
  }
}
