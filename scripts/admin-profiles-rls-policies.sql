-- Fix infinite recursion in profiles RLS admin policies.
-- Policies that SELECT from profiles to check is_admin re-trigger the same policies.
-- Use SECURITY DEFINER helpers that bypass RLS for the privilege check only.

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND (COALESCE(p.is_admin, false) = true OR COALESCE(p.is_superadmin, false) = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND COALESCE(p.is_superadmin, false) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_superadmin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
  FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_all_profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "superadmins_full_access" ON public.profiles;
CREATE POLICY "superadmins_full_access" ON public.profiles
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
