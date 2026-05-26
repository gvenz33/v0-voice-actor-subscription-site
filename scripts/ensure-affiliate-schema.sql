-- Run this once in Supabase → SQL Editor if affiliate codes fail with
-- "column profiles.affiliate_code does not exist"

-- ── profiles columns ──────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_affiliate_code_key
  ON public.profiles (affiliate_code)
  WHERE affiliate_code IS NOT NULL;

-- Payout columns (safe if already applied)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_credit numeric DEFAULT 0;

-- ── referral + payout tables ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paid', 'cancelled')),
  commission_rate numeric DEFAULT 0.20,
  total_earned numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(referred_user_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payout_method text,
  payout_details jsonb,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_referrals_select_own" ON public.affiliate_referrals;
CREATE POLICY "affiliate_referrals_select_own" ON public.affiliate_referrals
  FOR SELECT USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_referrals_insert" ON public.affiliate_referrals;
CREATE POLICY "affiliate_referrals_insert" ON public.affiliate_referrals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_payouts_select_own" ON public.affiliate_payouts;
CREATE POLICY "affiliate_payouts_select_own" ON public.affiliate_payouts
  FOR SELECT USING (auth.uid() = affiliate_user_id);

-- ── code generator (used by signup trigger) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'VOB' || result;
END;
$$;

-- ── verify ──────────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('affiliate_code', 'referred_by', 'stripe_connect_account_id')
ORDER BY column_name;
