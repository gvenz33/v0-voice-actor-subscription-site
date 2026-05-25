export type SubscriptionTier = "free" | "launch" | "momentum" | "command"

export const TIER_DISPLAY_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  launch: "Launch",
  momentum: "Momentum",
  command: "Command",
}

export function getTierDisplayLabel(tier: SubscriptionTier): string {
  return TIER_DISPLAY_LABELS[tier] ?? tier
}

export function normalizeSubscriptionTier(
  raw: string | null | undefined
): SubscriptionTier {
  const t = (raw ?? "free").trim().toLowerCase()
  if (t === "launch" || t === "momentum" || t === "command") {
    return t
  }
  if (t === "pro" || t === "enterprise") {
    return t === "enterprise" ? "command" : "momentum"
  }
  if (t.includes("command")) return "command"
  if (t.includes("momentum") || t.includes("pro")) return "momentum"
  if (t.includes("launch")) return "launch"
  return "free"
}

export function tierLabelFromRaw(raw: string | null | undefined): string {
  return getTierDisplayLabel(normalizeSubscriptionTier(raw))
}
