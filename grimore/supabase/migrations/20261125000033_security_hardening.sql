-- GriMore — security hardening and kill switches.
--
-- 1. Fix: the scan-shelf function creates its job with status 'processing',
--    but the insert policy only allowed 'pending', so every AI scan failed.
-- 2. Kill switches in public.app_config (edited in the dashboard / SQL by the
--    team only; readable by the app):
--      maintenance      -> the app shows a maintenance screen
--      writes_paused    -> the server refuses new posts, reviews, comments,
--                          messages, threads, replies, guestbook notes, reports
--      ai_scan_enabled  -> AI shelf / quote scans on or off
--      ai_scan_user_daily, ai_scan_global_daily -> AI cost caps per UTC day
-- 3. Rate limits can no longer be beaten by sending many requests at once
--    (the count and insert now run under a per-user lock).
-- 4. A birth date cannot be changed once set (teen limits could be bypassed).
-- 5. Counters (likes, comments, replies, members) cannot be forged when a row
--    is created through the API (they were only protected on update).

-- ------------------------------------------------------------ 1. Scan jobs
drop policy if exists "users create scan jobs" on public.scan_jobs;
create policy "users create scan jobs" on public.scan_jobs
  for insert to authenticated with check (user_id = (select auth.uid()) and status in ('pending', 'processing'));

-- ---------------------------------------------------------- 2. App config
create table if not exists public.app_config (
  key text primary key check (key ~ '^[a-z_]{3,40}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
-- Everyone (signed in or not) can read the switches; nobody but the service role can write them.
drop policy if exists "config is public" on public.app_config;
create policy "config is public" on public.app_config for select using (true);
revoke insert, update, delete on public.app_config from anon, authenticated;

insert into public.app_config (key, value) values
  ('maintenance', '{"on": false, "message": "Grimore is getting a quick polish. Back soon."}'),
  ('writes_paused', 'false'),
  ('ai_scan_enabled', 'true'),
  ('ai_scan_user_daily', '40'),
  ('ai_scan_global_daily', '1500')
on conflict (key) do nothing;

create or replace function private.config(p_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.app_config where key = p_key;
$$;

-- ------------------------------------------------- 3. Rate limit + freeze
create or replace function private.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max int := tg_argv[0]::int;
  v_window interval := tg_argv[1]::interval;
  v_owner_col text := coalesce(tg_argv[2], 'user_id');
  v_owner uuid;
  v_count int;
begin
  if coalesce((private.config('writes_paused'))::boolean, false) and current_setting('role', true) in ('authenticated', 'anon') then
    raise exception 'writes_paused' using errcode = 'P0503', hint = 'Posting is paused for a moment. Please try again later.';
  end if;
  execute format('select ($1).%I', v_owner_col) into v_owner using new;
  -- Serialise this reader's inserts on this table so parallel requests cannot all pass the count.
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || coalesce(v_owner::text, '')));
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, v_owner_col
  ) into v_count using v_owner, v_window;
  if v_count >= v_max then
    raise exception 'rate_limited' using errcode = 'P0429',
      hint = 'You are doing that too often. Please wait a moment.';
  end if;
  return new;
end;
$$;

-- AI scans: on/off switch and daily caps per reader and overall (cost control).
create or replace function private.guard_ai_scan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_user_cap int := coalesce((private.config('ai_scan_user_daily'))::int, 40);
  v_global_cap int := coalesce((private.config('ai_scan_global_daily'))::int, 1500);
begin
  if not coalesce((private.config('ai_scan_enabled'))::boolean, true) then
    raise exception 'scanner_paused' using errcode = 'P0503';
  end if;
  perform pg_advisory_xact_lock(hashtext('scan_jobs:global'));
  if (select count(*) from public.scan_jobs where user_id = new.user_id and created_at >= public.utc_today()::timestamptz) >= v_user_cap then
    raise exception 'scan_daily_limit' using errcode = 'P0429';
  end if;
  if (select count(*) from public.scan_jobs where created_at >= public.utc_today()::timestamptz) >= v_global_cap then
    raise exception 'scanner_busy' using errcode = 'P0503';
  end if;
  return new;
end;
$$;
drop trigger if exists scan_jobs_ai_guard on public.scan_jobs;
create trigger scan_jobs_ai_guard before insert on public.scan_jobs
  for each row execute function private.guard_ai_scan();

-- ---------------------------------------------------- 4. Birth date lock
create or replace function private.lock_birth_date() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.birth_date is distinct from old.birth_date and current_setting('role', true) in ('authenticated', 'anon') then
    raise exception 'birth_date_locked' using errcode = '42501', hint = 'Contact support to correct your date of birth.';
  end if;
  return new;
end;
$$;
drop trigger if exists profile_private_lock on public.profile_private;
create trigger profile_private_lock before update on public.profile_private
  for each row execute function private.lock_birth_date();

-- ------------------------------------------------ 5. Counters on insert
create or replace function private.zero_counters_on_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Only rows written straight through the API; trusted triggers (depth > 1) may set counts.
  if current_setting('role', true) in ('authenticated', 'anon') and pg_trigger_depth() = 1 then
    case tg_table_name
      when 'posts', 'reviews' then new.like_count := 0; new.comment_count := 0;
      when 'community_threads' then new.reply_count := 0;
      when 'communities' then new.member_count := 0;
      else null;
    end case;
  end if;
  return new;
end;
$$;
drop trigger if exists posts_zero_counters on public.posts;
create trigger posts_zero_counters before insert on public.posts for each row execute function private.zero_counters_on_insert();
drop trigger if exists reviews_zero_counters on public.reviews;
create trigger reviews_zero_counters before insert on public.reviews for each row execute function private.zero_counters_on_insert();
drop trigger if exists community_threads_zero_counters on public.community_threads;
create trigger community_threads_zero_counters before insert on public.community_threads for each row execute function private.zero_counters_on_insert();
drop trigger if exists communities_zero_counters on public.communities;
create trigger communities_zero_counters before insert on public.communities for each row execute function private.zero_counters_on_insert();

-- ------------------------------------------------- 6. Invite farming
-- Handled by 20261124000033_audit_invites_time_tags.sql (the inviter is paid
-- once the new reader has 3 days of games, logged pages or a finished book),
-- which was applied first; this section was dropped when merging to avoid two
-- competing reward triggers.
