-- Reactivate VO Biz Suite BETA and BlumVox BLUMVOX promos.
-- Landing beta popup stays disabled in app code; acknowledgement happens at checkout.

UPDATE public.promo_codes
SET
  active = true,
  discount_type = 'percent',
  discount_value = 50,
  applies_to_tiers = ARRAY['momentum', 'command'],
  billing_interval_restriction = 'year',
  requires_feedback_acknowledgement = true,
  valid_until = NULL,
  description = 'VO Biz Suite Beta — 50% off Momentum and Command with 12-month (annual) prepay. Active beta participation: one monthly feedback form for months 1–3. After 12 months, participants who completed feedback keep the discounted rate; others continue at regular rates.',
  updated_at = now()
WHERE upper(code) = 'BETA';

UPDATE public.promo_codes
SET
  active = true,
  discount_type = 'percent',
  discount_value = 50,
  applies_to_tiers = ARRAY['momentum', 'command'],
  billing_interval_restriction = 'quarter',
  requires_feedback_acknowledgement = true,
  valid_until = NULL,
  description = 'BlumVox students — 50% off Momentum and Command for an initial 3-month prepay. Complete one monthly feedback form in Months 1–3 to keep the discounted rate month-to-month afterward; otherwise continue at the regular monthly rate.',
  updated_at = now()
WHERE upper(code) = 'BLUMVOX';

CREATE OR REPLACE FUNCTION public.ensure_beta_enrollment(
  p_user_id uuid,
  p_promo_code text DEFAULT 'BETA',
  p_promo_redemption_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enrollment_id uuid;
  code_upper text := upper(p_promo_code);
  label text;
  period_end timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF code_upper = 'BETA' THEN
    label := 'VO Biz Suite Beta';
    period_end := now() + interval '12 months';
  ELSE
    label := 'BVS Beta';
    period_end := now() + interval '3 months';
  END IF;

  INSERT INTO public.beta_enrollments (
    user_id,
    promo_code,
    promo_redemption_id,
    program_label,
    ends_at
  )
  VALUES (
    p_user_id,
    code_upper,
    p_promo_redemption_id,
    label,
    period_end
  )
  ON CONFLICT (user_id, promo_code) DO UPDATE SET
    promo_redemption_id = COALESCE(EXCLUDED.promo_redemption_id, public.beta_enrollments.promo_redemption_id),
    program_label = EXCLUDED.program_label,
    updated_at = now()
  RETURNING id INTO enrollment_id;

  UPDATE public.profiles
  SET trial_exempt = true
  WHERE id = p_user_id;

  RETURN enrollment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_beta_enrollment(uuid, text, uuid)
  TO authenticated, service_role;
