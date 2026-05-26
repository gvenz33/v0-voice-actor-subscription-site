"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Download,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react"
import {
  USER_MEDIA_BUCKET,
  MEDIA_REPOSITORY_ACCEPT,
  buildUserMediaStoragePath,
  formatStorageBytes,
  isAllowedMediaRepositoryFile,
  maxUploadFileBytesForTier,
  mediaTitleFromFileName,
} from "@/lib/media-storage"

interface MediaRow {
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

export function MediaRepositorySettings({
  onStorageChange,
}: {
  onStorageChange?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<MediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
      .eq("category", "media")
      .order("created_at", { ascending: false })

    if (fetchError) {
      if (isMissingSchema(fetchError.message)) {
        setNeedsMigration(true)
      } else {
        setError(fetchError.message)
      }
      setFiles([])
    } else {
      setFiles((data as MediaRow[]) ?? [])
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
    if (fileSize > usage.remainingBytes) {
      setError(
        `Not enough storage. You have ${usage.usedLabel} of ${usage.limitLabel} used. Delete files or upgrade your plan.`
      )
      return false
    }
    return true
  }

  const handleUpload = async (file: File) => {
    setMessage("")
    setError("")
    if (!isAllowedMediaRepositoryFile(file, subscriptionTier)) {
      setError(
        `Unsupported file or too large. Max ${formatStorageBytes(maxUploadFileBytesForTier(subscriptionTier))} per file for your plan.`
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

    const storagePath = buildUserMediaStoragePath(user.id, "media", file.name)
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
      category: "media",
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
      setMessage("File added to your media repository.")
      await load()
      onStorageChange?.()
    }
    setUploading(false)
  }

  const handleDelete = async (row: MediaRow) => {
    setDeletingId(row.id)
    const supabase = createClient()
    await supabase.storage.from(USER_MEDIA_BUCKET).remove([row.storage_path])
    await supabase.from("user_media").delete().eq("id", row.id)
    setFiles((prev) => prev.filter((f) => f.id !== row.id))
    onStorageChange?.()
    setDeletingId(null)
  }

  const handleDownload = async (row: MediaRow) => {
    const supabase = createClient()
    const { data, error: urlError } = await supabase.storage
      .from(USER_MEDIA_BUCKET)
      .createSignedUrl(row.storage_path, 3600)
    if (urlError || !data?.signedUrl) {
      setError(urlError?.message || "Could not download")
      return
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  const handleTitleSave = async (row: MediaRow, title: string) => {
    const supabase = createClient()
    await supabase.from("user_media").update({ title }).eq("id", row.id)
    setFiles((prev) =>
      prev.map((f) => (f.id === row.id ? { ...f, title } : f))
    )
  }

  return (
    <Card id="media-repository">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Media repository
        </CardTitle>
        <CardDescription>
          Store headshots, scripts, PDFs, audio, and video in one place. Files count toward your
          plan&apos;s included storage.
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

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={MEDIA_REPOSITORY_ACCEPT}
            className="hidden"
            multiple
            onChange={(e) => {
              const list = e.target.files
              if (list?.[0]) void handleUpload(list[0])
              e.target.value = ""
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || needsMigration}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload file
          </Button>
          <Badge variant="outline" className="text-xs">
            Up to {formatStorageBytes(maxUploadFileBytesForTier(subscriptionTier))} per file
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files yet. Upload brand assets, scripts, or reference media here.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    defaultValue={row.title}
                    className="h-8 font-medium"
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (next && next !== row.title) void handleTitleSave(row, next)
                    }}
                  />
                  <p className="truncate text-xs text-muted-foreground">
                    {row.file_name} · {formatStorageBytes(row.file_size)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleDownload(row)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    disabled={deletingId === row.id}
                    onClick={() => handleDelete(row)}
                  >
                    {deletingId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
