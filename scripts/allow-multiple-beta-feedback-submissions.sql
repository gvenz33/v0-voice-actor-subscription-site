-- Allow more than one feedback submission per month for BETA and BLUMVOX testers.
ALTER TABLE public.beta_feedback_submissions
  DROP CONSTRAINT IF EXISTS beta_feedback_submissions_enrollment_id_month_number_key;

CREATE INDEX IF NOT EXISTS idx_beta_feedback_enrollment_month
  ON public.beta_feedback_submissions (enrollment_id, month_number, created_at DESC);
