"use client"

import { AdminBetaFeedbackClient } from "@/components/admin/admin-beta-feedback-client"
import { BLUMVOX_PROMO_CODE } from "@/lib/promo-codes"

export default function AdminBvsBetaFeedbackPage() {
  return <AdminBetaFeedbackClient program={BLUMVOX_PROMO_CODE} />
}
