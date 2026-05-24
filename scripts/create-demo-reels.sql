-- Demo reel uploads for voice actors
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.demo_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_reels_user_id ON public.demo_reels(user_id);

ALTER TABLE public.demo_reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_reels_select_own"
  ON public.demo_reels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "demo_reels_insert_own"
  ON public.demo_reels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "demo_reels_update_own"
  ON public.demo_reels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "demo_reels_delete_own"
  ON public.demo_reels FOR DELETE
  USING (auth.uid() = user_id);

-- Private storage bucket (25 MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demo-reels',
  'demo-reels',
  false,
  26214400,
  ARRAY[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "demo_reels_storage_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'demo-reels'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "demo_reels_storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'demo-reels'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "demo_reels_storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'demo-reels'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
