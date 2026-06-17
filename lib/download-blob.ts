/** Trigger a browser download from a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** Fetch an authenticated export endpoint and save the file. */
export async function downloadFromApi(path: string, filename: string) {
  const res = await fetch(path, { credentials: "include" })
  if (!res.ok) {
    const text = await res.text()
    let message = text.slice(0, 200)
    try {
      const j = JSON.parse(text) as { error?: string }
      if (j.error) message = j.error
    } catch {
      /* plain text */
    }
    throw new Error(message || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  downloadBlob(blob, filename)
}
