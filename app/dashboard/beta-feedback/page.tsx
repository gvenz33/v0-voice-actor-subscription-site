import { BetaFeedbackClient } from "../beta-feedback/beta-feedback-client"
import { BETA_PROMO_CODE } from "@/lib/promo-codes"

export default function BetaFeedbackPage() {
  return <BetaFeedbackClient program={BETA_PROMO_CODE} />
}
