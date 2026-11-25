"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  BILLING_DRAFT_INVOICE_QUERY_PARAM,
  countWords,
  DEFAULT_WPM,
  readingMinutes,
} from "@/lib/script-word-count"
import { createInvoiceFromScriptCount } from "@/lib/workflow-converts"
import {
  SCRIPT_FILE_ACCEPT,
  ScriptFileReadError,
  UNREADABLE_SCRIPT_FILE_MESSAGE,
  readUploadedScript,
} from "@/lib/script-file-text"
import { readLegacyDocFile } from "@/app/dashboard/script-tools/actions"
import { FileText, Loader2 } from "lucide-react"

export default function ScriptToolsPage() {
  const [text, setText] = useState("")
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const words = useMemo(() => countWords(text), [text])
  const minutes = useMemo(() => readingMinutes(words, DEFAULT_WPM), [words])

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setFileError(null)
    setFileLoading(true)
    try {
      const next = await readUploadedScript(file, async (docFile) => {
        const result = await readLegacyDocFile(docFile)
        if ("error" in result) throw new ScriptFileReadError(result.error)
        return result.text
      })
      setText(next)
    } catch (err) {
      setFileError(
        err instanceof ScriptFileReadError ? err.message : UNREADABLE_SCRIPT_FILE_MESSAGE,
      )
    }
    setFileLoading(false)
  }, [])

  const sendToBilling = async () => {
    if (words <= 0 || creatingDraft) return
    setBillingError(null)
    setCreatingDraft(true)
    try {
      const id = await createInvoiceFromScriptCount({
        wordCount: words,
        readingMinutes: minutes,
        wpm: DEFAULT_WPM,
      })
      const url = new URL("/dashboard/billing", window.location.origin)
      url.searchParams.set(BILLING_DRAFT_INVOICE_QUERY_PARAM, id)
      window.location.assign(url.toString())
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Could not open Billing Desk")
      setCreatingDraft(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="size-6" />
          Script word counter
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste a script or upload .txt, .doc, .docx, or .pdf. Word count uses the same logic as{" "}
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
              accept={SCRIPT_FILE_ACCEPT}
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

          {billingError && (
            <p className="text-sm text-destructive">{billingError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              disabled={words <= 0 || creatingDraft}
              onClick={() => void sendToBilling()}
              className="min-h-[44px]"
            >
              {creatingDraft && <Loader2 className="mr-2 size-4 animate-spin" />}
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
