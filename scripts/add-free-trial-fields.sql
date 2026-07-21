-- 14-day free trial for non-promo free-tier users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expired_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.trial_started_at IS 'When the free trial started for non-promo free users';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'When the free trial ends (14 days after start)';
COMMENT ON COLUMN public.profiles.trial_expired_notified_at IS 'When the trial-expired upgrade reminder email was sent';
COMMENT ON COLUMN public.profiles.trial_exempt IS 'True for promo/paid/admin users who are not on the standard free trial clock';

-- Admins and anyone already on a paid tier are exempt
UPDATE public.profiles
SET trial_exempt = true
WHERE coalesce(is_admin, false) = true
   OR coalesce(is_superadmin, false) = true
   OR coalesce(subscription_tier, 'free') <> 'free';

-- Promo redemptions exempt the user from the free-trial clock
UPDATE public.profiles p
SET trial_exempt = true
WHERE EXISTS (
  SELECT 1 FROM public.promo_redemptions pr WHERE pr.user_id = p.id
);

-- Existing free non-exempt users: trial clock from profile creation (may already be expired)
UPDATE public.profiles
SET
  trial_started_at = coalesce(trial_started_at, created_at),
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
WHERE coalesce(subscription_tier, 'free') = 'free'
  AND trial_exempt = false
  AND trial_ends_at IS NULL;

-- New signups get a 14-day trial via the auth trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    subscription_tier,
    trial_started_at,
    trial_ends_at,
    trial_exempt
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    'free',
    now(),
    now() + interval '14 days',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
