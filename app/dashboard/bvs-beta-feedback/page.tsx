import { BetaFeedbackClient } from "../beta-feedback/beta-feedback-client"
import { BLUMVOX_PROMO_CODE } from "@/lib/promo-codes"

export default function BvsBetaFeedbackPage() {
  return <BetaFeedbackClient program={BLUMVOX_PROMO_CODE} />
}
