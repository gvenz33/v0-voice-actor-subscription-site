import { generateText, type ModelMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { getOllamaProvider, OLLAMA_CHAT_MODEL } from "@/lib/ollama-ai"

const GROQ_CHAT_MODEL = "llama-3.1-8b-instant"
const OPENAI_CHAT_MODEL = "gpt-4o-mini"

function messageContentToString(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n")
  }
  return ""
}

/** Use Ollama when explicitly configured, or localhost defaults in local dev only. */
export function isOllamaConfigured(): boolean {
  const raw = process.env.OLLAMA_BASE_URL?.trim()
  if (!raw) {
    return process.env.NODE_ENV === "development" && process.env.VERCEL !== "1"
  }
  try {
    const host = new URL(raw).hostname
    const isLocal = host === "localhost" || host === "127.0.0.1"
    if (isLocal && process.env.VERCEL === "1") return false
    return true
  } catch {
    return false
  }
}

async function generateWithOllama(
  system: string,
  messages: ModelMessage[]
): Promise<string> {
  const result = await generateText({
    model: getOllamaProvider()(OLLAMA_CHAT_MODEL),
    system,
    messages,
    maxOutputTokens: 600,
    maxRetries: 0,
  })
  return result.text
}

async function generateWithGroq(
  system: string,
  messages: ModelMessage[]
): Promise<string> {
  const apiKey = (process.env.GROQ_API_KEY || "").trim()
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set")
  }

  const groqMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [{ role: "system", content: system }]

  for (const message of messages) {
    if (message.role === "system" || message.role === "tool") continue
    groqMessages.push({
      role: message.role,
      content: messageContentToString(message.content),
    })
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: groqMessages,
      max_tokens: 600,
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    let detail = errorText.slice(0, 200)
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } }
      if (parsed.error?.message) detail = parsed.error.message
    } catch {
      /* plain text */
    }
    throw new Error(`Groq API error: ${res.status} - ${detail}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || ""
}

async function generateWithOpenAI(
  system: string,
  messages: ModelMessage[]
): Promise<string> {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim()
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }

  const openai = createOpenAI({ apiKey })
  const result = await generateText({
    model: openai(OPENAI_CHAT_MODEL),
    system,
    messages,
    maxOutputTokens: 600,
    maxRetries: 0,
  })
  return result.text
}

/**
 * VO Coach + Assistant: Ollama when configured, then Groq, then OpenAI.
 */
export async function generateChatReply(
  system: string,
  messages: ModelMessage[]
): Promise<string> {
  const failures: string[] = []

  if (isOllamaConfigured()) {
    try {
      return await generateWithOllama(system, messages)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`Ollama: ${msg}`)
      console.warn("[chat-ai] Ollama unavailable, trying fallback:", msg)
    }
  }

  if ((process.env.GROQ_API_KEY || "").trim()) {
    try {
      return await generateWithGroq(system, messages)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`Groq: ${msg}`)
      console.warn("[chat-ai] Groq failed, trying OpenAI:", msg)
    }
  }

  if ((process.env.OPENAI_API_KEY || "").trim()) {
    try {
      return await generateWithOpenAI(system, messages)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`OpenAI: ${msg}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`AI chat unavailable. ${failures.join(" | ")}`)
  }

  throw new Error(
    "AI chat is not configured. Set GROQ_API_KEY or OPENAI_API_KEY on Vercel, or OLLAMA_BASE_URL for a reachable Ollama server."
  )
}
