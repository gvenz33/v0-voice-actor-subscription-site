-- Manual calendar events (alongside synced Google / Microsoft / CalDAV sources)

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_check CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx ON public.calendar_events (user_id);
CREATE INDEX IF NOT EXISTS calendar_events_starts_at_idx ON public.calendar_events (user_id, starts_at);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_own" ON public.calendar_events;

CREATE POLICY "calendar_events_select_own" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_insert_own" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_events_update_own" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_delete_own" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);
