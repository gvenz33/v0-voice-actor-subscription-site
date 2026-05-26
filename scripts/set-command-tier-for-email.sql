-- Fix affiliate + Command tier for gvenz33@gmail.com (run in Supabase SQL Editor)

-- 1) Verify the auth user exists
SELECT id, email FROM auth.users WHERE lower(email) = lower('gvenz33@gmail.com');

-- 2) Set Command tier, superadmin, and clear affiliate disable override
UPDATE public.profiles
SET
  subscription_tier = 'command',
  is_superadmin = true,
  is_admin = true,
  feature_overrides = CASE
    WHEN feature_overrides IS NULL THEN '{}'::jsonb
    ELSE feature_overrides - 'hasAffiliate'
  END,
  updated_at = now()
WHERE id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('gvenz33@gmail.com')
  LIMIT 1
);

-- 3) Confirm (should show command + is_superadmin true)
SELECT
  p.id,
  u.email,
  p.subscription_tier,
  p.is_superadmin,
  p.is_admin,
  p.feature_overrides,
  p.affiliate_code
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = lower('gvenz33@gmail.com');

-- 4) Ensure affiliate program is enabled globally
INSERT INTO public.system_settings (key, value)
VALUES ('affiliate_program_enabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now();
