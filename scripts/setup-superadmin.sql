-- Setup superadmin and feature overrides

-- Add feature_overrides column to profiles for per-user feature toggling
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feature_overrides jsonb DEFAULT '{}'::jsonb;

-- Add is_superadmin column for full control (cannot be revoked by other admins)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false;

-- Make gvenz33@gmail.com the superadmin
UPDATE public.profiles 
SET 
  is_admin = true,
  is_superadmin = true
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'gvenz33@gmail.com'
  LIMIT 1
);

-- Create policy allowing superadmins to do everything
DROP POLICY IF EXISTS "superadmins_full_access" ON public.profiles;
CREATE POLICY "superadmins_full_access" ON public.profiles
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_superadmin = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_superadmin = true)
  );

-- Feature overrides structure:
-- {
--   "hasFollowUpWriter": true/false/null (null = use tier default),
--   "hasPitchGenerator": true/false/null,
--   "hasChatAssistant": true/false/null,
--   "hasProspectFinder": true/false/null,
--   "monthlyTokensOverride": number/null (null = use tier default, -1 = unlimited),
--   "disabled": true/false (completely disable account)
-- }

COMMENT ON COLUMN public.profiles.feature_overrides IS 'JSON object for per-user feature overrides. Null values use tier defaults.';
COMMENT ON COLUMN public.profiles.is_superadmin IS 'Superadmin has full control and cannot be demoted by regular admins.';
