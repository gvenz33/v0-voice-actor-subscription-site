-- Add stripe_connect_account_id to profiles for affiliate payouts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Add subscription_credit to profiles for applying affiliate earnings as credit
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_credit numeric DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON public.profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
