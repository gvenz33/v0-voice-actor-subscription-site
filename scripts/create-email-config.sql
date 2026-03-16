-- Email configuration table for OAuth and SMTP settings
create table if not exists public.email_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  provider text, -- 'gmail', 'outlook', 'smtp', or null
  -- OAuth tokens (encrypted in practice, stored as-is for simplicity here)
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamptz,
  oauth_email text, -- The connected email address
  -- SMTP settings
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_use_tls boolean default true,
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.email_config enable row level security;

create policy "email_config_select_own" on public.email_config for select using (auth.uid() = user_id);
create policy "email_config_insert_own" on public.email_config for insert with check (auth.uid() = user_id);
create policy "email_config_update_own" on public.email_config for update using (auth.uid() = user_id);
create policy "email_config_delete_own" on public.email_config for delete using (auth.uid() = user_id);
