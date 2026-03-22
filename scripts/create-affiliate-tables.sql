-- Add affiliate_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;

-- Create affiliate_referrals table to track referrals and commissions
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paid', 'cancelled')),
  commission_rate numeric DEFAULT 0.20, -- 20% commission
  total_earned numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(referred_user_id) -- Each user can only be referred once
);

-- Create affiliate_payouts table to track commission payouts
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

-- Enable RLS on affiliate tables
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_referrals
CREATE POLICY "affiliate_referrals_select_own" ON public.affiliate_referrals 
  FOR SELECT USING (auth.uid() = affiliate_user_id);

CREATE POLICY "affiliate_referrals_insert" ON public.affiliate_referrals 
  FOR INSERT WITH CHECK (true);

-- RLS policies for affiliate_payouts
CREATE POLICY "affiliate_payouts_select_own" ON public.affiliate_payouts 
  FOR SELECT USING (auth.uid() = affiliate_user_id);

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
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

-- Update trigger to auto-generate affiliate code on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_affiliate_code text;
BEGIN
  -- Generate unique affiliate code
  LOOP
    new_affiliate_code := generate_affiliate_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = new_affiliate_code);
  END LOOP;

  INSERT INTO public.profiles (id, first_name, last_name, affiliate_code)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    new_affiliate_code
  )
  ON CONFLICT (id) DO UPDATE SET
    affiliate_code = COALESCE(profiles.affiliate_code, new_affiliate_code);

  RETURN new;
END;
$$;

-- Generate affiliate codes for existing users who don't have one
DO $$
DECLARE
  profile_record RECORD;
  new_code text;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles WHERE affiliate_code IS NULL LOOP
    LOOP
      new_code := generate_affiliate_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = new_code);
    END LOOP;
    UPDATE public.profiles SET affiliate_code = new_code WHERE id = profile_record.id;
  END LOOP;
END;
$$;
