"use client"

import { useRef } from "react"
import Link from "next/link"
import { Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MAX_EMAIL_ATTACHMENT_BYTES, totalAttachmentBytes } from "@/lib/read-file-base64"

export type DemoReelOption = {
  id: string
  title: string
  file_name: string
}

type EmailAttachmentPickerProps = {
  files: File[]
  onFilesChange: (files: File[]) => void
  demoReels?: DemoReelOption[]
  selectedDemoReelIds?: string[]
  onDemoReelIdsChange?: (ids: string[]) => void
  className?: string
}

export function EmailAttachmentPicker({
  files,
  onFilesChange,
  demoReels = [],
  selectedDemoReelIds = [],
  onDemoReelIdsChange,
  className,
}: EmailAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fileBytes = totalAttachmentBytes(files)
  const overLimit = fileBytes > MAX_EMAIL_ATTACHMENT_BYTES

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) return
    onFilesChange([...files, ...picked])
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className={className ?? "rounded-lg border border-border p-4"}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Paperclip className="size-4" />
        Attachments
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Files from your computer</Label>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="mr-2 size-4" />
            Add files
          </Button>
          {files.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-2 rounded border border-border/60 px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {file.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {overLimit && (
            <p className="mt-2 text-xs text-destructive">
              Selected files exceed 25 MB. Remove some files before sending.
            </p>
          )}
        </div>

        {onDemoReelIdsChange && (
          <div>
            <Label className="text-xs text-muted-foreground">Demo reels from your library</Label>
            {demoReels.length > 0 ? (
              <div className="mt-2 flex flex-col gap-2">
                {demoReels.map((reel) => (
                  <label
                    key={reel.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selectedDemoReelIds.includes(reel.id)}
                      onCheckedChange={(checked) => {
                        onDemoReelIdsChange(
                          checked
                            ? [...selectedDemoReelIds, reel.id]
                            : selectedDemoReelIds.filter((id) => id !== reel.id)
                        )
                      }}
                    />
                    <span className="text-sm">
                      <span className="font-medium">{reel.title}</span>
                      <span className="block text-xs text-muted-foreground">{reel.file_name}</span>
                    </span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  Upload more in{" "}
                  <Link href="/dashboard/settings#demo-reels" className="underline">
                    Settings → Demo Reels
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No demos uploaded yet.{" "}
                <Link href="/dashboard/settings#demo-reels" className="underline">
                  Upload in Settings
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
