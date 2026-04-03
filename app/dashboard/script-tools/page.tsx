"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import mammoth from "mammoth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  BILLING_WORD_COUNT_SESSION_KEY,
  countWords,
  DEFAULT_WPM,
  readingMinutes,
} from "@/lib/script-word-count"
import { FileText, Loader2 } from "lucide-react"

export default function ScriptToolsPage() {
  const [text, setText] = useState("")
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const words = useMemo(() => countWords(text), [text])
  const minutes = useMemo(() => readingMinutes(words, DEFAULT_WPM), [words])

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setFileError(null)
    setFileLoading(true)
    try {
      const name = file.name.toLowerCase()
      if (name.endsWith(".txt")) {
        const t = await file.text()
        setText(t)
      } else if (name.endsWith(".docx")) {
        const buf = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer: buf })
        setText(result.value || "")
      } else {
        setFileError("Use a .txt or .docx file.")
      }
    } catch {
      setFileError("Could not read file.")
    }
    setFileLoading(false)
  }, [])

  const sendToBilling = () => {
    if (words <= 0) return
    try {
      sessionStorage.setItem(BILLING_WORD_COUNT_SESSION_KEY, String(words))
    } catch {
      /* ignore */
    }
    window.location.href = "/dashboard/billing"
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="size-6" />
          Script word counter
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste a script or upload .txt / .docx. Word count uses the same logic as{" "}
          <Link href="/dashboard/billing" className="text-violet-600 underline underline-offset-2">
            Billing Desk
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Script</CardTitle>
          <CardDescription>
            Reading time assumes {DEFAULT_WPM} WPM (same default as billing).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="script-upload">Upload</Label>
            <Input
              id="script-upload"
              type="file"
              accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onFile}
              disabled={fileLoading}
            />
            {fileLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Reading file…
              </div>
            )}
            {fileError && (
              <p className="text-sm text-destructive">{fileError}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="script-text">Paste script</Label>
            <Textarea
              id="script-text"
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your VO script here…"
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <span>
              <strong className="text-foreground">{words.toLocaleString("en-US")}</strong>{" "}
              words
            </span>
            <span className="text-muted-foreground">·</span>
            <span>
              ~<strong>{minutes}</strong> min read
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={words <= 0}
              onClick={sendToBilling}
              className="min-h-[44px]"
            >
              Use in Billing Desk
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setText("")}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
