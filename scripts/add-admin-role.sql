-- Add is_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create admin users view (for admin dashboard)
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  u.id,
  u.email,
  u.created_at as signup_date,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.banned_until,
  p.first_name,
  p.last_name,
  p.business_name,
  p.subscription_tier,
  p.is_admin,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- Grant access to the view for authenticated users (will be filtered by RLS on profiles)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Create policy allowing admins to view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  );

-- Create policy allowing admins to update all profiles
CREATE POLICY "admins_can_update_all_profiles" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  );
