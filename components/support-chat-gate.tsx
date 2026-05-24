import { SupportChatWidget } from "@/components/support-chat-widget"
import { isSupportChatEnabled } from "@/lib/system-settings"

export async function SupportChatGate() {
  const enabled = await isSupportChatEnabled()

  if (!enabled) {
    return null
  }

  return <SupportChatWidget />
}
