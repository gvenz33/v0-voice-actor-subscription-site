-- Track which subscription period_end already received the 4-day charge reminder email.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS upcoming_charge_notified_period_end timestamptz;

COMMENT ON COLUMN public.profiles.upcoming_charge_notified_period_end IS
  'Stripe subscription current_period_end (as timestamptz) for which we already sent the 4-day upcoming charge email.';
