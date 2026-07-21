"use client"

import Link from "next/link"
import type { TrialStatus } from "@/lib/trial"
import { FREE_TRIAL_DAYS } from "@/lib/trial"

export function TrialBanner({ trial }: { trial: TrialStatus }) {
  if (!trial.isFreeTier || trial.isExempt) return null

  if (trial.isExpired) {
    return (
      <div className="mb-6 rounded-xl border border-artist-orange/40 bg-artist-orange/10 px-4 py-3 text-sm text-foreground">
        <p className="font-medium">Your {FREE_TRIAL_DAYS}-day free trial has ended.</p>
        <p className="mt-1 text-muted-foreground">
          Upgrade to keep using VO Biz Suite.{" "}
          <Link href="/dashboard/billing" className="font-medium text-primary underline underline-offset-4">
            View plans
          </Link>
        </p>
      </div>
    )
  }

  if (trial.daysRemaining == null) return null

  return (
    <div className="mb-6 rounded-xl border border-artist-violet/30 bg-artist-violet/10 px-4 py-3 text-sm text-foreground">
      <p className="font-medium">
        Free trial: {trial.daysRemaining} day{trial.daysRemaining === 1 ? "" : "s"} remaining
      </p>
      <p className="mt-1 text-muted-foreground">
        Upgrade anytime to keep access after your trial.{" "}
        <Link href="/dashboard/billing" className="font-medium text-primary underline underline-offset-4">
          View plans
        </Link>
      </p>
    </div>
  )
}
