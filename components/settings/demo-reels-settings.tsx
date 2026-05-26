"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Download,
  Loader2,
  Mic,
  Play,
  Trash2,
  Upload,
} from "lucide-react"
import {
  buildDemoReelStoragePath,
  DEMO_REEL_ACCEPT,
  DEMO_REELS_BUCKET,
  demoReelTitleFromFileName,
  formatDemoReelFileSize,
  isAllowedDemoReelFile,
  MAX_DEMO_REEL_FILE_SIZE_BYTES,
  MAX_DEMO_REELS_PER_USER,
} from "@/lib/demo-reels"

interface DemoReel {
  id: string
  title: string
  file_name: string
  storage_path: string
  file_size: number
  mime_type: string | null
  created_at: string
}

function isMissingTableError(message: string): boolean {
  return (
    message.includes("demo_reels") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  )
}

export function DemoReelsSettings({
  onStorageChange,
}: {
  onStorageChange?: () => void
} = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reels, setReels] = useState<DemoReel[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playbackUrls, setPlaybackUrls] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [tableNotCreated, setTableNotCreated] = useState(false)
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null)

  const loadReels = useCallback(async () => {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from("demo_reels")
      .select("*")
      .order("created_at", { ascending: false })

    if (fetchError) {
      if (isMissingTableError(fetchError.message)) {
        setTableNotCreated(true)
      } else {
        setError(fetchError.message)
      }
      setReels([])
    } else {
      setTableNotCreated(false)
      setReels((data as DemoReel[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadReels()
  }, [loadReels])

  const getSignedUrl = async (storagePath: string) => {
    const supabase = createClient()
    const { data, error: urlError } = await supabase.storage
      .from(DEMO_REELS_BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (urlError || !data?.signedUrl) {
      throw new Error(urlError?.message || "Could not load file")
    }

    return data.signedUrl
  }

  const handleUpload = async (file: File) => {
    setMessage("")
    setError("")

    if (!isAllowedDemoReelFile(file)) {
      setError(
        `Unsupported file or file too large. Use MP3, WAV, M4A, AAC, OGG, or MP4 up to ${formatDemoReelFileSize(MAX_DEMO_REEL_FILE_SIZE_BYTES)}.`
      )
      return
    }

    if (reels.length >= MAX_DEMO_REELS_PER_USER) {
      setError(`You can upload up to ${MAX_DEMO_REELS_PER_USER} demo reels. Delete one to add another.`)
      return
    }

    const usageRes = await fetch("/api/media-storage/usage", { cache: "no-store" })
    if (usageRes.ok) {
      const usage = await usageRes.json()
      if (file.size > usage.remainingBytes) {
        setError(
          `Not enough storage. You have ${usage.usedLabel} of ${usage.limitLabel} used. Delete files or upgrade your plan.`
        )
        return
      }
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("You must be signed in to upload demo reels.")
      }

      const storagePath = buildDemoReelStoragePath(user.id, file.name)

      const { error: uploadError } = await supabase.storage
        .from(DEMO_REELS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      setUploadProgress(80)

      const { error: insertError } = await supabase.from("demo_reels").insert({
        user_id: user.id,
        title: demoReelTitleFromFileName(file.name),
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
      })

      if (insertError) {
        await supabase.storage.from(DEMO_REELS_BUCKET).remove([storagePath])
        throw new Error(insertError.message)
      }

      setUploadProgress(100)
      setMessage(`Uploaded "${file.name}".`)
      await loadReels()
      onStorageChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (reel: DemoReel) => {
    setDeletingId(reel.id)
    setMessage("")
    setError("")

    try {
      const supabase = createClient()
      const { error: storageError } = await supabase.storage
        .from(DEMO_REELS_BUCKET)
        .remove([reel.storage_path])

      if (storageError) {
        throw new Error(storageError.message)
      }

      const { error: deleteError } = await supabase
        .from("demo_reels")
        .delete()
        .eq("id", reel.id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      setPlaybackUrls((prev) => {
        const next = { ...prev }
        delete next[reel.id]
        return next
      })
      if (playingId === reel.id) {
        setPlayingId(null)
      }
      setMessage(`Deleted "${reel.title}".`)
      await loadReels()
      onStorageChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.")
    } finally {
      setDeletingId(null)
    }
  }

  const handlePlay = async (reel: DemoReel) => {
    setError("")
    try {
      if (playingId === reel.id) {
        setPlayingId(null)
        return
      }

      let url = playbackUrls[reel.id]
      if (!url) {
        url = await getSignedUrl(reel.storage_path)
        setPlaybackUrls((prev) => ({ ...prev, [reel.id]: url }))
      }
      setPlayingId(reel.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not play file.")
    }
  }

  const handleDownload = async (reel: DemoReel) => {
    setError("")
    try {
      const url = playbackUrls[reel.id] ?? (await getSignedUrl(reel.storage_path))
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download file.")
    }
  }

  const handleTitleSave = async (reel: DemoReel, title: string) => {
    const trimmed = title.trim()
    if (!trimmed || trimmed === reel.title) return

    setSavingTitleId(reel.id)
    setError("")

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("demo_reels")
        .update({ title: trimmed })
        .eq("id", reel.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setReels((prev) =>
        prev.map((item) => (item.id === reel.id ? { ...item, title: trimmed } : item))
      )
      setMessage("Title updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update title.")
    } finally {
      setSavingTitleId(null)
    }
  }

  return (
    <Card id="demo-reels">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-4" />
          Demo Reels
        </CardTitle>
        <CardDescription>
          Upload your voice demo files so they are ready when pitching clients or attaching to outreach.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tableNotCreated && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-500" />
              <p className="font-medium text-amber-500">Database setup required</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Run{" "}
              <code className="rounded bg-muted px-1">scripts/create-demo-reels.sql</code> in the
              Supabase SQL Editor, then refresh this page.
            </p>
          </div>
        )}

        {!tableNotCreated && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal">
                  {reels.length} / {MAX_DEMO_REELS_PER_USER} reels
                </Badge>
                <span className="text-xs text-muted-foreground">
                  MP3, WAV, M4A, AAC, OGG, MP4 · max{" "}
                  {formatDemoReelFileSize(MAX_DEMO_REEL_FILE_SIZE_BYTES)} each
                </span>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={DEMO_REEL_ACCEPT}
                  className="sr-only"
                  disabled={uploading || reels.length >= MAX_DEMO_REELS_PER_USER}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleUpload(file)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={uploading || reels.length >= MAX_DEMO_REELS_PER_USER}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? "Uploading…" : "Upload Demo Reel"}
                </Button>
              </div>
            </div>

            {uploading && uploadProgress > 0 && (
              <p className="text-xs text-muted-foreground">Upload progress: {uploadProgress}%</p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : reels.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No demo reels yet. Upload your commercial, narration, or character demos here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reels.map((reel) => {
                  const isVideo = reel.mime_type?.startsWith("video/") || reel.file_name.endsWith(".mp4")
                  const isPlaying = playingId === reel.id
                  const playbackUrl = playbackUrls[reel.id]

                  return (
                    <div
                      key={reel.id}
                      className="rounded-lg border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Input
                            defaultValue={reel.title}
                            disabled={savingTitleId === reel.id}
                            onBlur={(e) => void handleTitleSave(reel, e.target.value)}
                            className="min-h-[40px] font-medium"
                          />
                          <p className="truncate text-xs text-muted-foreground">
                            {reel.file_name} · {formatDemoReelFileSize(reel.file_size)} ·{" "}
                            {new Date(reel.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => void handlePlay(reel)}
                          >
                            <Play className="size-3.5" />
                            {isPlaying ? "Hide" : "Play"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => void handleDownload(reel)}
                          >
                            <Download className="size-3.5" />
                            Open
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            disabled={deletingId === reel.id}
                            onClick={() => void handleDelete(reel)}
                          >
                            {deletingId === reel.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>

                      {isPlaying && playbackUrl && (
                        <div className="mt-3">
                          {isVideo ? (
                            <video controls className="w-full rounded-md" src={playbackUrl}>
                              <track kind="captions" />
                            </video>
                          ) : (
                            <audio controls className="w-full" src={playbackUrl}>
                              <track kind="captions" />
                            </audio>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {message && <p className="text-sm text-green-500">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
