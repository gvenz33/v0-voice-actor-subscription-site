-- Knowledge base table for AI context (run in Supabase SQL Editor if missing)
-- Safe to re-run. Use when you see:
-- "Could not find the table 'public.user_knowledge_base' in the schema cache"

CREATE TABLE IF NOT EXISTS public.user_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_knowledge_base_user_id
  ON public.user_knowledge_base(user_id);

ALTER TABLE public.user_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_knowledge_base_select_own" ON public.user_knowledge_base;
CREATE POLICY "user_knowledge_base_select_own" ON public.user_knowledge_base
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_knowledge_base_insert_own" ON public.user_knowledge_base;
CREATE POLICY "user_knowledge_base_insert_own" ON public.user_knowledge_base
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_knowledge_base_update_own" ON public.user_knowledge_base;
CREATE POLICY "user_knowledge_base_update_own" ON public.user_knowledge_base
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_knowledge_base_delete_own" ON public.user_knowledge_base;
CREATE POLICY "user_knowledge_base_delete_own" ON public.user_knowledge_base
  FOR DELETE USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_knowledge_base';
