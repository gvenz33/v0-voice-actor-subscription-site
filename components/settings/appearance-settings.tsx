"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function AppearanceSettings() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = !mounted || resolvedTheme === "dark"

  return (
    <Card className="artist-card-violet">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isDark ? <Moon className="size-4 text-artist-violet" /> : <Sun className="size-4 text-artist-amber" />}
          Appearance
        </CardTitle>
        <CardDescription>
          Switch between light and dark studio themes. Your choice is saved in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/50 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Label htmlFor="theme-dark-mode" className="text-sm font-medium text-foreground">
              Dark mode
            </Label>
            <p className="text-xs text-muted-foreground">
              {isDark ? "Studio night — richer contrast for late sessions" : "Daylight studio — softer surfaces for daytime work"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Sun className="size-4 text-artist-amber" aria-hidden />
            <Switch
              id="theme-dark-mode"
              checked={isDark}
              disabled={!mounted}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
            <Moon className="size-4 text-artist-violet" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
