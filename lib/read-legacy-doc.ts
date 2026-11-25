import WordExtractor from "word-extractor"
import {
  EMPTY_SCRIPT_FILE_MESSAGE,
  ScriptFileReadError,
  UNREADABLE_SCRIPT_FILE_MESSAGE,
} from "@/lib/script-file-text"

/** Extract body text from a legacy OLE Word `.doc` buffer. */
export async function readLegacyDocBuffer(data: Uint8Array): Promise<string> {
  let text = ""
  try {
    const doc = await new WordExtractor().extract(Buffer.from(data))
    text = doc.getBody() || ""
  } catch (err) {
    if (err instanceof ScriptFileReadError) throw err
    throw new ScriptFileReadError(UNREADABLE_SCRIPT_FILE_MESSAGE)
  }
  if (!text.trim()) {
    throw new ScriptFileReadError(EMPTY_SCRIPT_FILE_MESSAGE)
  }
  return text
}
