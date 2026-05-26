"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react"
import {
  USER_MEDIA_BUCKET,
  RESUME_ACCEPT,
  MAX_RESUME_FILE_BYTES,
  buildUserMediaStoragePath,
  formatStorageBytes,
  isAllowedResumeFile,
  mediaTitleFromFileName,
} from "@/lib/media-storage"

interface ResumeRow {
  id: string
  title: string
  file_name: string
  storage_path: string
  file_size: number
  mime_type: string | null
  created_at: string
}

function isMissingSchema(message: string): boolean {
  return (
    message.includes("user_media") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  )
}

export function ResumeSettings({
  onStorageChange,
}: {
  onStorageChange?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resume, setResume] = useState<ResumeRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [needsMigration, setNeedsMigration] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle()
    setSubscriptionTier(profile?.subscription_tier ?? "free")

    const { data, error: fetchError } = await supabase
      .from("user_media")
      .select("*")
      .eq("user_id", user.id)
      .eq("category", "resume")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      if (isMissingSchema(fetchError.message)) {
        setNeedsMigration(true)
      } else {
        setError(fetchError.message)
      }
      setResume(null)
    } else {
      setResume((data as ResumeRow) ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const checkQuota = async (fileSize: number) => {
    const res = await fetch("/api/media-storage/usage", { cache: "no-store" })
    const usage = await res.json()
    if (!res.ok) return true
    if (fileSize > usage.remainingBytes + (resume?.file_size ?? 0)) {
      setError(
        `Not enough storage. You have ${usage.usedLabel} of ${usage.limitLabel} used. Free space or upgrade your plan.`
      )
      return false
    }
    return true
  }

  const handleUpload = async (file: File) => {
    setMessage("")
    setError("")
    if (!isAllowedResumeFile(file)) {
      setError(
        `Use PDF, DOC, DOCX, or TXT up to ${formatStorageBytes(MAX_RESUME_FILE_BYTES)}.`
      )
      return
    }
    if (!(await checkQuota(file.size))) return

    setUploading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be signed in.")
      setUploading(false)
      return
    }

    const storagePath = buildUserMediaStoragePath(user.id, "resume", file.name)

    if (resume) {
      await supabase.storage.from(USER_MEDIA_BUCKET).remove([resume.storage_path])
      await supabase.from("user_media").delete().eq("id", resume.id)
    }

    const { error: uploadError } = await supabase.storage
      .from(USER_MEDIA_BUCKET)
      .upload(storagePath, file, { upsert: false, contentType: file.type || undefined })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from("user_media").insert({
      user_id: user.id,
      category: "resume",
      title: mediaTitleFromFileName(file.name),
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
    })

    if (insertError) {
      await supabase.storage.from(USER_MEDIA_BUCKET).remove([storagePath])
      if (isMissingSchema(insertError.message)) setNeedsMigration(true)
      else setError(insertError.message)
    } else {
      setMessage("Resume uploaded.")
      await load()
      onStorageChange?.()
    }
    setUploading(false)
  }

  const handleDelete = async () => {
    if (!resume) return
    setDeleting(true)
    setError("")
    const supabase = createClient()
    await supabase.storage.from(USER_MEDIA_BUCKET).remove([resume.storage_path])
    await supabase.from("user_media").delete().eq("id", resume.id)
    setResume(null)
    setMessage("Resume removed.")
    onStorageChange?.()
    setDeleting(false)
  }

  const handleDownload = async () => {
    if (!resume) return
    const supabase = createClient()
    const { data, error: urlError } = await supabase.storage
      .from(USER_MEDIA_BUCKET)
      .createSignedUrl(resume.storage_path, 3600)
    if (urlError || !data?.signedUrl) {
      setError(urlError?.message || "Could not download")
      return
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Card id="resume">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Resume
        </CardTitle>
        <CardDescription>
          Upload one resume (PDF, Word, or TXT). Counts toward your plan&apos;s media storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsMigration && (
          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            <p>
              Run <code className="rounded bg-muted px-1">scripts/ensure-media-repository.sql</code>{" "}
              in Supabase SQL Editor.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : resume ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{resume.title}</p>
              <p className="text-sm text-muted-foreground">
                {resume.file_name} · {formatStorageBytes(resume.file_size)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={RESUME_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
            e.target.value = ""
          }}
        />
        {!resume && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || needsMigration}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload resume
          </Button>
        )}
        <Badge variant="outline" className="w-fit text-xs">
          Max {formatStorageBytes(MAX_RESUME_FILE_BYTES)} · {subscriptionTier ?? "free"} plan storage
        </Badge>
        {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
