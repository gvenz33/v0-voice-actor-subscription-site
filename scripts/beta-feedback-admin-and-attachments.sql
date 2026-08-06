-- Admin-controlled beta feedback participation + screenshot attachments

ALTER TABLE public.beta_enrollments
  ADD COLUMN IF NOT EXISTS participation_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.beta_enrollments.participation_enabled IS
  'When false, user is disabled from the beta feedback program (admin toggle). History is retained.';

ALTER TABLE public.beta_feedback_submissions
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.beta_feedback_submissions.attachments IS
  'Screenshot attachments: [{storage_path,file_name,mime_type,file_size}]';

DROP POLICY IF EXISTS "Users update own beta feedback" ON public.beta_feedback_submissions;
CREATE POLICY "Users update own beta feedback"
  ON public.beta_feedback_submissions FOR UPDATE
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'beta-feedback',
  'beta-feedback',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
