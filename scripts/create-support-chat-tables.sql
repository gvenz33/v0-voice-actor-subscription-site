-- Support Chat Tables for AI Customer Support
-- Run this in Supabase SQL Editor

-- Support conversations table
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text NOT NULL,
  visitor_name text,
  visitor_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'resolved', 'closed')),
  escalated_at timestamptz,
  escalated_reason text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'admin')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Support escalation notifications
CREATE TABLE IF NOT EXISTS public.support_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  notified_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_visitor ON public.support_conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_notifications_conversation ON public.support_notifications(conversation_id);

-- RLS Policies
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/authenticated users to create and view their own conversations
CREATE POLICY "Users can view their own conversations"
  ON public.support_conversations
  FOR SELECT
  USING (visitor_id = coalesce(current_setting('request.headers', true)::json->>'x-visitor-id', '') OR user_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.support_conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own conversations"
  ON public.support_conversations
  FOR UPDATE
  USING (visitor_id = coalesce(current_setting('request.headers', true)::json->>'x-visitor-id', '') OR user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.support_conversations 
      WHERE visitor_id = coalesce(current_setting('request.headers', true)::json->>'x-visitor-id', '')
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (true);

-- Admin policies (superadmins can see all)
CREATE POLICY "Admins can view all conversations"
  ON public.support_conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR is_superadmin = true)
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.support_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR is_superadmin = true)
    )
  );

CREATE POLICY "Admins can manage notifications"
  ON public.support_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR is_superadmin = true)
    )
  );

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_support_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when new message is added
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.support_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_conversation_timestamp();
