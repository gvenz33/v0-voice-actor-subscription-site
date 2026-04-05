-- Multi-account email + optional CalDAV calendar sources (run in Supabase SQL Editor)
-- Migrates legacy public.email_config (one row per user) into public.email_accounts.

create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  label text,
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamptz,
  oauth_email text,
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_use_tls boolean default true,
  imap_host text,
  imap_port int,
  imap_username text,
  imap_password text,
  imap_use_tls boolean default true,
  bcc_self boolean default false,
  signature_text text,
  is_default_for_send boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- At most one default sender per user
create unique index if not exists email_accounts_one_default_per_user
  on public.email_accounts (user_id)
  where is_default_for_send = true;

-- Reconnecting the same OAuth inbox updates the same row
create unique index if not exists email_accounts_oauth_identity
  on public.email_accounts (user_id, provider, oauth_email)
  where oauth_email is not null;

alter table public.email_accounts enable row level security;

create policy "email_accounts_select_own" on public.email_accounts
  for select using (auth.uid() = user_id);
create policy "email_accounts_insert_own" on public.email_accounts
  for insert with check (auth.uid() = user_id);
create policy "email_accounts_update_own" on public.email_accounts
  for update using (auth.uid() = user_id);
create policy "email_accounts_delete_own" on public.email_accounts
  for delete using (auth.uid() = user_id);

-- CalDAV (e.g. iCloud) calendar connections
create table if not exists public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'caldav',
  display_name text,
  caldav_url text not null default 'https://caldav.icloud.com',
  caldav_username text not null,
  caldav_password text not null,
  principal_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists calendar_sources_user_id_idx on public.calendar_sources (user_id);

alter table public.calendar_sources enable row level security;

create policy "calendar_sources_select_own" on public.calendar_sources
  for select using (auth.uid() = user_id);
create policy "calendar_sources_insert_own" on public.calendar_sources
  for insert with check (auth.uid() = user_id);
create policy "calendar_sources_update_own" on public.calendar_sources
  for update using (auth.uid() = user_id);
create policy "calendar_sources_delete_own" on public.calendar_sources
  for delete using (auth.uid() = user_id);

-- One-time migration from legacy email_config (single row per user), if that table exists.
-- Older projects may omit signature_text (or other columns); branch so migration still runs.
do $$
declare
  legacy_has_signature_text boolean;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'email_config'
  ) then
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_config'
      and column_name = 'signature_text'
  )
  into legacy_has_signature_text;

  if legacy_has_signature_text then
    insert into public.email_accounts (
      user_id,
      provider,
      oauth_access_token,
      oauth_refresh_token,
      oauth_expires_at,
      oauth_email,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      smtp_use_tls,
      bcc_self,
      signature_text,
      is_default_for_send,
      created_at,
      updated_at
    )
    select
      ec.user_id,
      ec.provider,
      ec.oauth_access_token,
      ec.oauth_refresh_token,
      ec.oauth_expires_at,
      ec.oauth_email,
      ec.smtp_host,
      ec.smtp_port,
      ec.smtp_username,
      ec.smtp_password,
      ec.smtp_from_email,
      ec.smtp_from_name,
      coalesce(ec.smtp_use_tls, true),
      coalesce(ec.bcc_self, false),
      ec.signature_text,
      true,
      ec.created_at,
      ec.updated_at
    from public.email_config ec
    where not exists (
      select 1 from public.email_accounts ea where ea.user_id = ec.user_id
    );
  else
    insert into public.email_accounts (
      user_id,
      provider,
      oauth_access_token,
      oauth_refresh_token,
      oauth_expires_at,
      oauth_email,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      smtp_use_tls,
      bcc_self,
      signature_text,
      is_default_for_send,
      created_at,
      updated_at
    )
    select
      ec.user_id,
      ec.provider,
      ec.oauth_access_token,
      ec.oauth_refresh_token,
      ec.oauth_expires_at,
      ec.oauth_email,
      ec.smtp_host,
      ec.smtp_port,
      ec.smtp_username,
      ec.smtp_password,
      ec.smtp_from_email,
      ec.smtp_from_name,
      coalesce(ec.smtp_use_tls, true),
      coalesce(ec.bcc_self, false),
      null::text,
      true,
      ec.created_at,
      ec.updated_at
    from public.email_config ec
    where not exists (
      select 1 from public.email_accounts ea where ea.user_id = ec.user_id
    );
  end if;
  end if;
end $$;

-- Optional: after verifying the app uses email_accounts only, you may drop legacy table:
-- drop table if exists public.email_config;
