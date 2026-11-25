"use server"

import { readLegacyDocBuffer } from "@/lib/read-legacy-doc"
import {
  ScriptFileReadError,
  UNREADABLE_SCRIPT_FILE_MESSAGE,
  UNSUPPORTED_SCRIPT_FILE_MESSAGE,
  scriptFileKind,
} from "@/lib/script-file-text"

export async function readLegacyDocFile(
  file: File,
): Promise<{ text: string } | { error: string }> {
  if (scriptFileKind(file.name) !== "doc") {
    return { error: UNSUPPORTED_SCRIPT_FILE_MESSAGE }
  }

  try {
    const text = await readLegacyDocBuffer(new Uint8Array(await file.arrayBuffer()))
    return { text }
  } catch (err) {
    if (err instanceof ScriptFileReadError) return { error: err.message }
    return { error: UNREADABLE_SCRIPT_FILE_MESSAGE }
  }
}
