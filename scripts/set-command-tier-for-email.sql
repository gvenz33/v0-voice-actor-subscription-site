-- Set subscription tier to command for a specific account (run in Supabase SQL Editor)
-- Replace the email if needed.

UPDATE public.profiles
SET
  subscription_tier = 'command',
  updated_at = now()
WHERE id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('gvenz33@gmail.com')
  LIMIT 1
);

-- Clear affiliate disable override if present
UPDATE public.profiles
SET feature_overrides = feature_overrides - 'hasAffiliate'
WHERE id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('gvenz33@gmail.com')
  LIMIT 1
)
AND feature_overrides->>'hasAffiliate' = 'false';
