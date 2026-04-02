-- Link bookings and invoices to Client Hub contacts.
-- Run this in the Supabase SQL Editor for your project.
-- Touchpoints and submissions already use contact_id in the app.

alter table public.bookings
  add column if not exists contact_id uuid references public.contacts (id) on delete set null;

alter table public.invoices
  add column if not exists contact_id uuid references public.contacts (id) on delete set null;

create index if not exists bookings_contact_id_idx on public.bookings (contact_id)
  where contact_id is not null;

create index if not exists invoices_contact_id_idx on public.invoices (contact_id)
  where contact_id is not null;
