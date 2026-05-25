import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  getSystemSetting,
  isAffiliateProgramEnabled,
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
  const affiliateProgramEnabled = await isAffiliateProgramEnabled()

  return NextResponse.json({
    supportChatEnabled,
    affiliateProgramEnabled,
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
    affiliateProgramEnabled?: boolean
  }

  if (
    typeof body.supportChatEnabled !== "boolean" &&
    typeof body.affiliateProgramEnabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Provide supportChatEnabled and/or affiliateProgramEnabled" },
      { status: 400 }
    )
  }

  if (typeof body.supportChatEnabled === "boolean") {
    const { error: saveError } = await setSystemSetting(
      SYSTEM_SETTING_KEYS.supportChatEnabled,
      body.supportChatEnabled
    )
    if (saveError) {
      return NextResponse.json({ error: saveError }, { status: 500 })
    }
  }

  if (typeof body.affiliateProgramEnabled === "boolean") {
    const { error: saveError } = await setSystemSetting(
      SYSTEM_SETTING_KEYS.affiliateProgramEnabled,
      body.affiliateProgramEnabled
    )
    if (saveError) {
      return NextResponse.json({ error: saveError }, { status: 500 })
    }
  }

  const supportChatEnabled = await getSystemSetting(
    SYSTEM_SETTING_KEYS.supportChatEnabled,
    body.supportChatEnabled ?? true
  )
  const affiliateProgramEnabled = await getSystemSetting(
    SYSTEM_SETTING_KEYS.affiliateProgramEnabled,
    body.affiliateProgramEnabled ?? true
  )

  return NextResponse.json({
    success: true,
    supportChatEnabled:
      typeof supportChatEnabled === "boolean"
        ? supportChatEnabled
        : body.supportChatEnabled,
    affiliateProgramEnabled:
      typeof affiliateProgramEnabled === "boolean"
        ? affiliateProgramEnabled
        : body.affiliateProgramEnabled,
  })
}
