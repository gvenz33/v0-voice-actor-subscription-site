import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { SettingsForm } from "./settings-form"

function SettingsFormFallback() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20">
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFormFallback />}>
      <SettingsForm />
    </Suspense>
  )
}
