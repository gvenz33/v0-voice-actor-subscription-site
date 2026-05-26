import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listUserMediaForAttachments } from "@/lib/user-media-server"

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

    const media = await listUserMediaForAttachments(supabase, user.id)
    return NextResponse.json({ media })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load media" },
      { status: 500 }
    )
  }
}
