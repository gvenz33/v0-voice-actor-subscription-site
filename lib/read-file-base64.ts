export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const MAX_EMAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024

export function totalAttachmentBytes(files: File[]): number {
  return files.reduce((sum, f) => sum + f.size, 0)
}
