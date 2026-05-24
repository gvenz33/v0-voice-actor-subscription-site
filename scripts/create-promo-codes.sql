-- Promo codes for subscription discounts
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  applies_to_tiers text[] NOT NULL DEFAULT '{}',
  billing_interval_restriction text NOT NULL DEFAULT 'any'
    CHECK (billing_interval_restriction IN ('month', 'year', 'any')),
  requires_feedback_acknowledgement boolean NOT NULL DEFAULT false,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_session_id text,
  tier text,
  billing_interval text,
  discount_applied_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes (upper(code));
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_code_id ON public.promo_redemptions (promo_code_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Public read for active promo validation at checkout
CREATE POLICY "Anyone can read active promo codes"
  ON public.promo_codes FOR SELECT
  USING (active = true);

-- Admins manage promo codes
CREATE POLICY "Admins manage promo codes"
  ON public.promo_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );

CREATE POLICY "Users can read own promo redemptions"
  ON public.promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage promo redemptions"
  ON public.promo_redemptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );

CREATE OR REPLACE FUNCTION public.increment_promo_redemption(p_promo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET
    redemption_count = redemption_count + 1,
    updated_at = now()
  WHERE id = p_promo_id
    AND active = true
    AND (valid_until IS NULL OR valid_until >= now())
    AND valid_from <= now()
    AND (max_redemptions IS NULL OR redemption_count < max_redemptions);

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_redemption(uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.record_promo_redemption(
  p_promo_id uuid,
  p_user_id uuid,
  p_stripe_session_id text,
  p_tier text,
  p_billing_interval text,
  p_discount_applied_cents integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incremented boolean;
BEGIN
  incremented := public.increment_promo_redemption(p_promo_id);
  IF NOT incremented THEN
    RETURN false;
  END IF;

  INSERT INTO public.promo_redemptions (
    promo_code_id,
    user_id,
    stripe_session_id,
    tier,
    billing_interval,
    discount_applied_cents
  ) VALUES (
    p_promo_id,
    p_user_id,
    p_stripe_session_id,
    p_tier,
    p_billing_interval,
    COALESCE(p_discount_applied_cents, 0)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_promo_redemption(uuid, uuid, text, text, text, integer)
  TO authenticated, anon, service_role;

-- Seed beta tester promo: 50% off Pro (Momentum) and Enterprise (Command), yearly only
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
  'BETA',
  'Beta tester launch — 50% off Pro and Enterprise annual plans',
  'percent',
  50,
  ARRAY['momentum', 'command'],
  'year',
  true,
  true
)
ON CONFLICT (code) DO NOTHING;
