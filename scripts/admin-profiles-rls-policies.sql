-- Allow admins and superadmins to view/update all profiles (own-row policies remain)
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true OR is_superadmin = true
    )
  );

DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_all_profiles" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true OR is_superadmin = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true OR is_superadmin = true
    )
  );

DROP POLICY IF EXISTS "superadmins_full_access" ON public.profiles;
CREATE POLICY "superadmins_full_access" ON public.profiles
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_superadmin = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_superadmin = true)
  );
