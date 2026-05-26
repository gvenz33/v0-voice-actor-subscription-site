"use client"

import { useState } from "react"
import { StorageUsageBar } from "@/components/settings/storage-usage-bar"
import { BrandVoiceSettings } from "@/components/settings/brand-voice-settings"
import { ResumeSettings } from "@/components/settings/resume-settings"
import { DemoReelsSettings } from "@/components/settings/demo-reels-settings"
import { MediaRepositorySettings } from "@/components/settings/media-repository-settings"
import { KnowledgeBaseSettings } from "@/components/settings/knowledge-base-settings"

export function CreatorAssetsSection() {
  const [storageRefreshKey, setStorageRefreshKey] = useState(0)

  const bumpStorage = () => setStorageRefreshKey((k) => k + 1)

  return (
    <div className="flex flex-col gap-6" id="creator-assets">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Creator assets</h3>
        <p className="text-sm text-muted-foreground">
          Demo reels, resume, brand voice for AI Tools, and your media library—storage included
          with your subscription tier.
        </p>
      </div>
      <StorageUsageBar refreshKey={storageRefreshKey} />
      <BrandVoiceSettings />
      <KnowledgeBaseSettings />
      <ResumeSettings onStorageChange={bumpStorage} />
      <DemoReelsSettings onStorageChange={bumpStorage} />
      <MediaRepositorySettings onStorageChange={bumpStorage} />
    </div>
  )
}
