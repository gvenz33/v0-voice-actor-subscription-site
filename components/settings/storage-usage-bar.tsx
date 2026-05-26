"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HardDrive, Loader2 } from "lucide-react"
import Link from "next/link"
import type { StorageUsageSnapshot } from "@/lib/media-storage-server"

export function StorageUsageBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [usage, setUsage] = useState<StorageUsageSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/media-storage/usage", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load storage")
      setUsage(data as StorageUsageSnapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load storage")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <Card id="media-storage" className="scroll-mt-24 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5 text-primary" />
          Media storage (included in your plan)
        </CardTitle>
        <CardDescription>
          Demo reels, resume, and media repository share one pool. Storage is bundled with your
          subscription—we allocate generous space per tier with margin built into your monthly rate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating usage…
          </div>
        ) : error ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
        ) : usage ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium text-foreground">{usage.usedLabel}</span>
                <span className="text-muted-foreground"> of {usage.limitLabel} used</span>
              </span>
              <span className="text-muted-foreground capitalize">{usage.tier} plan</span>
            </div>
            <Progress value={usage.percentUsed} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {usage.remainingBytes > 0
                ? `${usage.usedLabel} used · ${usage.limitLabel} total included`
                : "Storage full—delete files or "}
              {usage.remainingBytes <= 0 && (
                <Link href="/#pricing" className="underline text-primary">
                  upgrade your plan
                </Link>
              )}
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">Plan allocation:</strong> Free 50 MB · Launch
              500 MB · Momentum 2 GB · Command 10 GB. Included in your subscription—no separate
              storage bill.
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
