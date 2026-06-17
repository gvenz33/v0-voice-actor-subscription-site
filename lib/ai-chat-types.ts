export type AiChatToolType = "coach" | "assistant" | "pitch"

export type StoredChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type AiChatSessionSummary = {
  id: string
  tool_type: AiChatToolType
  title: string | null
  updated_at: string
  created_at: string
}

export type AiChatSession = AiChatSessionSummary & {
  messages: StoredChatMessage[]
}

export function sessionTitleFromMessages(
  messages: StoredChatMessage[],
  fallback: string,
): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim())
  if (!firstUser) return fallback
  const line = firstUser.content.trim().split("\n")[0]
  return line.length > 60 ? `${line.slice(0, 57)}...` : line
}
