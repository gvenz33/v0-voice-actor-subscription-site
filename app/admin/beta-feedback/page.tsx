"use client"

import { AdminBetaFeedbackClient } from "@/components/admin/admin-beta-feedback-client"
import { BETA_PROMO_CODE } from "@/lib/promo-codes"

export default function AdminBetaFeedbackPage() {
  return <AdminBetaFeedbackClient program={BETA_PROMO_CODE} />
}
