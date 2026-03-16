-- Create email signatures table
create table if not exists public.email_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  signature_text text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.email_signatures enable row level security;

create policy "email_signatures_select_own" on public.email_signatures for select using (auth.uid() = user_id);
create policy "email_signatures_insert_own" on public.email_signatures for insert with check (auth.uid() = user_id);
create policy "email_signatures_update_own" on public.email_signatures for update using (auth.uid() = user_id);
