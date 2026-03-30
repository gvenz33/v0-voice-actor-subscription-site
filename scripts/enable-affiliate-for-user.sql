-- Enable affiliate for gvenz33@gmail.com (Command tier user)
-- This script ensures the user has proper subscription tier and removes any affiliate disabling overrides

-- First, let's check the current state of the user
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.subscription_tier,
  p.affiliate_code,
  p.feature_overrides,
  au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'gvenz33@gmail.com';

-- Update the user to ensure:
-- 1. subscription_tier is 'command'
-- 2. Remove any hasAffiliate: false override
-- 3. Ensure they have an affiliate code
UPDATE public.profiles
SET 
  subscription_tier = 'command',
  feature_overrides = COALESCE(feature_overrides, '{}'::jsonb) - 'hasAffiliate'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'gvenz33@gmail.com'
);

-- If they don't have an affiliate code, generate one
UPDATE public.profiles
SET affiliate_code = 'VOB' || upper(substr(md5(random()::text), 1, 8))
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'gvenz33@gmail.com'
)
AND affiliate_code IS NULL;

-- Verify the changes
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.subscription_tier,
  p.affiliate_code,
  p.feature_overrides,
  au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'gvenz33@gmail.com';
