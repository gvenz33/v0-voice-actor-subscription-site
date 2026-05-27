import { createOllama } from "ai-sdk-ollama"

/** Default chat model — override with OLLAMA_MODEL (e.g. llama3.2, mistral, qwen2.5). */
export const OLLAMA_CHAT_MODEL =
  (process.env.OLLAMA_MODEL || "llama3.2").trim()

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim()
}

export function getOllamaProvider() {
  const apiKey = (process.env.OLLAMA_API_KEY || "").trim()
  return createOllama({
    baseURL: getOllamaBaseUrl(),
    ...(apiKey ? { apiKey } : {}),
  })
}
