import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  getSystemSetting,
  isSupportChatEnabled,
  setSystemSetting,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings"

export async function GET() {
  const { error } = await requireAdmin()
  if (error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supportChatEnabled = await isSupportChatEnabled()

  return NextResponse.json({
    supportChatEnabled,
  })
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin()
  if (error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    supportChatEnabled?: boolean
  }

  if (typeof body.supportChatEnabled !== "boolean") {
    return NextResponse.json(
      { error: "supportChatEnabled must be a boolean" },
      { status: 400 }
    )
  }

  const { error: saveError } = await setSystemSetting(
    SYSTEM_SETTING_KEYS.supportChatEnabled,
    body.supportChatEnabled
  )

  if (saveError) {
    return NextResponse.json({ error: saveError }, { status: 500 })
  }

  const supportChatEnabled = await getSystemSetting(
    SYSTEM_SETTING_KEYS.supportChatEnabled,
    body.supportChatEnabled
  )

  return NextResponse.json({
    success: true,
    supportChatEnabled:
      typeof supportChatEnabled === "boolean"
        ? supportChatEnabled
        : body.supportChatEnabled,
  })
}
