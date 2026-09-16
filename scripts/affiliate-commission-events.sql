-- Affiliate commission ledger for idempotent Stripe accruals
CREATE TABLE IF NOT EXISTS public.affiliate_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  stripe_invoice_id text UNIQUE,
  stripe_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commission_events_affiliate
  ON public.affiliate_commission_events (affiliate_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_commission_events_referral
  ON public.affiliate_commission_events (referral_id);

ALTER TABLE public.affiliate_commission_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates read own commission events" ON public.affiliate_commission_events;
CREATE POLICY "Affiliates read own commission events"
  ON public.affiliate_commission_events FOR SELECT
  USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "Admins manage commission events" ON public.affiliate_commission_events;
CREATE POLICY "Admins manage commission events"
  ON public.affiliate_commission_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );

-- Allow affiliates / service to update referral totals (webhook uses service role)
DROP POLICY IF EXISTS "Admins update affiliate referrals" ON public.affiliate_referrals;
CREATE POLICY "Admins update affiliate referrals"
  ON public.affiliate_referrals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
    )
  );
