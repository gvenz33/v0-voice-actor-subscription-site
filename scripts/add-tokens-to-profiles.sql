-- Add purchased_tokens column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS purchased_tokens integer DEFAULT 0;

-- Add tokens_used column to ai_usage table (if not exists)
ALTER TABLE public.ai_usage 
ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0;

-- Create token_transactions table to track purchases and usage
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  operation text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on token_transactions
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for token_transactions
CREATE POLICY "token_transactions_select_own" ON public.token_transactions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "token_transactions_insert_own" ON public.token_transactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
