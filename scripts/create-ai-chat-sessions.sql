-- AI chat session history (Coach, Assistant, Pitch)
-- Run in Supabase SQL Editor or via apply_migration

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_type text NOT NULL CHECK (tool_type IN ('coach', 'assistant', 'pitch')),
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_tool
  ON public.ai_chat_sessions(user_id, tool_type, updated_at DESC);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_sessions_select_own"
  ON public.ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_chat_sessions_insert_own"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_chat_sessions_update_own"
  ON public.ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "ai_chat_sessions_delete_own"
  ON public.ai_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_ai_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_chat_sessions_updated_at ON public.ai_chat_sessions;
CREATE TRIGGER ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_chat_session_updated_at();
