-- System-wide settings (admin console)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Support chat enabled by default
INSERT INTO public.system_settings (key, value)
VALUES ('support_chat_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for public pages)
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

-- Admins can update settings
CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );

-- Admins can insert settings
CREATE POLICY "Admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );
