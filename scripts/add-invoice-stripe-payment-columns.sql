-- Stripe payment link fields for client invoice payments
-- Run in Supabase SQL Editor

alter table public.invoices
  add column if not exists stripe_payment_link_id text,
  add column if not exists stripe_payment_link_url text;

create index if not exists invoices_stripe_payment_link_id_idx
  on public.invoices (stripe_payment_link_id)
  where stripe_payment_link_id is not null;
