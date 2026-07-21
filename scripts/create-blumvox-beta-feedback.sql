-- BlumVox student beta enrollment + monthly feedback
-- Run in Supabase SQL Editor (or apply via migration)

-- Allow quarter (3-month) billing on promo restrictions
ALTER TABLE public.promo_codes
  DROP CONSTRAINT IF EXISTS promo_codes_billing_interval_restriction_check;

ALTER TABLE public.promo_codes
  ADD CONSTRAINT promo_codes_billing_interval_restriction_check
  CHECK (billing_interval_restriction IN ('month', 'year', 'quarter', 'any'));

-- Deactivate old public BETA popup promo; seed BlumVox student offer
UPDATE public.promo_codes
SET active = false, updated_at = now()
WHERE upper(code) = 'BETA';

INSERT INTO public.promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  applies_to_tiers,
  billing_interval_restriction,
  requires_feedback_acknowledgement,
  active
)
VALUES (
  'BLUMVOX',
  'BlumVox students — 50% off Momentum and Command (monthly or 3-month prepay). Active beta participation: one monthly feedback form for 3 months.',
  'percent',
  50,
  ARRAY['momentum', 'command'],
  'any',
  true,
  true
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  applies_to_tiers = EXCLUDED.applies_to_tiers,
  billing_interval_restriction = EXCLUDED.billing_interval_restriction,
  requires_feedback_acknowledgement = EXCLUDED.requires_feedback_acknowledgement,
  active = true,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.beta_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code text NOT NULL DEFAULT 'BLUMVOX',
  promo_redemption_id uuid REFERENCES public.promo_redemptions(id) ON DELETE SET NULL,
  program_label text NOT NULL DEFAULT 'BVS Beta',
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '3 months'),
  -- active_beta | retained_discount | regular_rate
  status text NOT NULL DEFAULT 'active_beta'
    CHECK (status IN ('active_beta', 'retained_discount', 'regular_rate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code)
);

CREATE TABLE IF NOT EXISTS public.beta_feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.beta_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_number integer NOT NULL CHECK (month_number BETWEEN 1 AND 3),
  feature_used_most text NOT NULL,
  confusing_or_difficult text NOT NULL,
  more_useful text NOT NULL,
  saved_time_or_organized text NOT NULL,
  would_recommend boolean NOT NULL,
  referral_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, month_number)
);

CREATE INDEX IF NOT EXISTS idx_beta_enrollments_user_id ON public.beta_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_beta_enrollments_status ON public.beta_enrollments (status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_enrollment_id ON public.beta_feedback_submissions (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON public.beta_feedback_submissions (user_id);

ALTER TABLE public.beta_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own beta enrollments" ON public.beta_enrollments;
CREATE POLICY "Users read own beta enrollments"
  ON public.beta_enrollments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own beta enrollments" ON public.beta_enrollments;
CREATE POLICY "Users update own beta enrollments"
  ON public.beta_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage beta enrollments" ON public.beta_enrollments;
CREATE POLICY "Admins manage beta enrollments"
  ON public.beta_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );

DROP POLICY IF EXISTS "Users read own beta feedback" ON public.beta_feedback_submissions;
CREATE POLICY "Users read own beta feedback"
  ON public.beta_feedback_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own beta feedback" ON public.beta_feedback_submissions;
CREATE POLICY "Users insert own beta feedback"
  ON public.beta_feedback_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage beta feedback" ON public.beta_feedback_submissions;
CREATE POLICY "Admins manage beta feedback"
  ON public.beta_feedback_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );

CREATE OR REPLACE FUNCTION public.ensure_beta_enrollment(
  p_user_id uuid,
  p_promo_code text DEFAULT 'BLUMVOX',
  p_promo_redemption_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enrollment_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.beta_enrollments (user_id, promo_code, promo_redemption_id)
  VALUES (p_user_id, upper(p_promo_code), p_promo_redemption_id)
  ON CONFLICT (user_id, promo_code) DO UPDATE SET
    promo_redemption_id = COALESCE(EXCLUDED.promo_redemption_id, public.beta_enrollments.promo_redemption_id),
    updated_at = now()
  RETURNING id INTO enrollment_id;

  RETURN enrollment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_beta_enrollment(uuid, text, uuid)
  TO authenticated, service_role;
