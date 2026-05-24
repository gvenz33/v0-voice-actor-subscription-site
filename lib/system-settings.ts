import { createClient } from "@/lib/supabase/server"

export const SYSTEM_SETTING_KEYS = {
  supportChatEnabled: "support_chat_enabled",
} as const

type SystemSettingKey =
  (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS]

function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}

export async function getSystemSetting<T = unknown>(
  key: SystemSettingKey,
  fallback: T
): Promise<T> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle()

    if (error || !data) {
      return fallback
    }

    return (data.value as T) ?? fallback
  } catch {
    return fallback
  }
}

export async function isSupportChatEnabled(): Promise<boolean> {
  const value = await getSystemSetting(
    SYSTEM_SETTING_KEYS.supportChatEnabled,
    true
  )
  return parseBooleanSetting(value, true)
}

export async function setSystemSetting(
  key: SystemSettingKey,
  value: unknown
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from("system_settings").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )

  return { error: error?.message ?? null }
}
