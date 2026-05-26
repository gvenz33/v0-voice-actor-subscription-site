-- Creator assets: brand voice, resume, media repository, storage tracking
-- Run in Supabase SQL Editor (safe to re-run)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS brand_voice text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS media_storage_used_bytes bigint DEFAULT 0;

COMMENT ON COLUMN public.profiles.brand_voice IS 'User-defined tone/style guide for AI email and message generation';
COMMENT ON COLUMN public.profiles.media_storage_used_bytes IS 'Cached total bytes across demo_reels + user_media';

CREATE TABLE IF NOT EXISTS public.user_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('resume', 'media')),
  title text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON public.user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_category ON public.user_media(user_id, category);

ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_media_select_own" ON public.user_media;
CREATE POLICY "user_media_select_own" ON public.user_media
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_media_insert_own" ON public.user_media;
CREATE POLICY "user_media_insert_own" ON public.user_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_media_update_own" ON public.user_media;
CREATE POLICY "user_media_update_own" ON public.user_media
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_media_delete_own" ON public.user_media;
CREATE POLICY "user_media_delete_own" ON public.user_media
  FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-media', 'user-media', false, 104857600)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 104857600;

DROP POLICY IF EXISTS "user_media_storage_select_own" ON storage.objects;
CREATE POLICY "user_media_storage_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "user_media_storage_insert_own" ON storage.objects;
CREATE POLICY "user_media_storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "user_media_storage_delete_own" ON storage.objects;
CREATE POLICY "user_media_storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Sync cached usage (optional maintenance)
CREATE OR REPLACE FUNCTION public.sync_profile_media_storage_used(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total bigint := 0;
  reel_sum bigint := 0;
  media_sum bigint := 0;
BEGIN
  SELECT coalesce(sum(file_size), 0) INTO reel_sum FROM public.demo_reels WHERE user_id = p_user_id;
  SELECT coalesce(sum(file_size), 0) INTO media_sum FROM public.user_media WHERE user_id = p_user_id;
  total := reel_sum + media_sum;
  UPDATE public.profiles SET media_storage_used_bytes = total, updated_at = now() WHERE id = p_user_id;
  RETURN total;
END;
$$;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('brand_voice', 'media_storage_used_bytes')
ORDER BY column_name;
