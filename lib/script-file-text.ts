import mammoth from "mammoth"

/** Shown when the upload is not a supported script file. */
export const UNSUPPORTED_SCRIPT_FILE_MESSAGE = "Use a .txt, .doc, .docx, or .pdf file."

/** Shown when a supported file cannot be parsed. */
export const UNREADABLE_SCRIPT_FILE_MESSAGE = "Could not read file."

/** Shown when a Word or PDF file parses but has no text to count. */
export const EMPTY_SCRIPT_FILE_MESSAGE = "No readable text found in this file."

export const SCRIPT_FILE_ACCEPT =
  ".txt,.doc,.docx,.pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"

export class ScriptFileReadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ScriptFileReadError"
  }
}

export type ScriptFileKind = "txt" | "doc" | "docx" | "pdf"

export function scriptFileKind(name: string): ScriptFileKind | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".txt")) return "txt"
  if (lower.endsWith(".docx")) return "docx"
  if (lower.endsWith(".doc")) return "doc"
  if (lower.endsWith(".pdf")) return "pdf"
  return null
}

async function readDocxArrayBuffer(data: ArrayBuffer): Promise<string> {
  // The browser build reads `arrayBuffer` (the existing upload path). Node reads `buffer`.
  const input =
    typeof window === "undefined"
      ? { buffer: Buffer.from(data) }
      : { arrayBuffer: data }
  const result = await mammoth.extractRawText(input)
  return result.value || ""
}

async function readPdfArrayBuffer(data: ArrayBuffer): Promise<string> {
  let text = ""
  try {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(data))
    const extracted = await extractText(pdf, { mergePages: true })
    text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text || ""
  } catch (err) {
    if (err instanceof ScriptFileReadError) throw err
    throw new ScriptFileReadError(UNREADABLE_SCRIPT_FILE_MESSAGE)
  }
  if (!text.trim()) {
    throw new ScriptFileReadError(EMPTY_SCRIPT_FILE_MESSAGE)
  }
  return text
}

/**
 * Read an uploaded script into plain text for `countWords`.
 * `.txt` and `.docx` keep the previous behavior. `.doc` is delegated so the
 * legacy Word parser can stay on the server.
 */
export async function readUploadedScript(
  file: File,
  readDoc: (file: File) => Promise<string>,
): Promise<string> {
  const kind = scriptFileKind(file.name)
  if (kind === "txt") return file.text()
  if (kind === "docx") return readDocxArrayBuffer(await file.arrayBuffer())
  if (kind === "pdf") return readPdfArrayBuffer(await file.arrayBuffer())
  if (kind === "doc") return readDoc(file)
  throw new ScriptFileReadError(UNSUPPORTED_SCRIPT_FILE_MESSAGE)
}
