-- GriMore — security lockdown (audit of 25 Nov).
--
-- 1. Rate limits on every table a reader writes to directly (follows, likes,
--    saves, joins, blocks, lists, quotes, library, analytics, catalogue), so
--    they also obey the writes_paused kill switch.
-- 2. Edge Function guard: begin_edge_call() checks the per-function kill
--    switch, writes_paused and a per-reader hourly cap before heavy work
--    (the Kobo import; the AI scanner already has its own guard).
-- 3. Least privilege: signed-out visitors (anon) can read only the app
--    switches; signed-in readers lose write grants on every table that only
--    the server writes (points, items, games, catalogue, seasons…), and the
--    retired Market is closed. RLS already blocked these; this is a second lock.

-- ------------------------------------------------------------ 1. Rate limits
-- Optional 4th trigger argument: the timestamp column to count (default created_at).
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
  v_time_col text := coalesce(tg_argv[3], 'created_at');
  v_owner uuid;
  v_count int;
begin
  if coalesce((private.config('writes_paused'))::boolean, false) and current_setting('role', true) in ('authenticated', 'anon') then
    raise exception 'writes_paused' using errcode = 'P0503', hint = 'Posting is paused for a moment. Please try again later.';
  end if;
  execute format('select ($1).%I', v_owner_col) into v_owner using new;
  if v_owner is null then return new; end if;
  -- Serialise this reader's inserts on this table so parallel requests cannot all pass the count.
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || v_owner::text));
  execute format(
    'select count(*) from %I.%I where %I = $1 and %I > now() - $2',
    tg_table_schema, tg_table_name, v_owner_col, v_time_col
  ) into v_count using v_owner, v_window;
  if v_count >= v_max then
    raise exception 'rate_limited' using errcode = 'P0429',
      hint = 'You are doing that too often. Please wait a moment.';
  end if;
  return new;
end;
$$;

do $$
declare r record;
begin
  for r in select * from (values
    ('follows',             '120', '1 hour', 'follower_id', 'created_at'),
    ('post_reactions',      '600', '1 hour', 'user_id',     'created_at'),
    ('review_reactions',    '600', '1 hour', 'user_id',     'created_at'),
    ('saved_items',         '300', '1 hour', 'user_id',     'created_at'),
    ('community_members',   '60',  '1 hour', 'user_id',     'joined_at'),
    ('community_events',    '30',  '1 day',  'created_by',  'created_at'),
    ('user_blocks',         '100', '1 hour', 'blocker_id',  'created_at'),
    ('reading_lists',       '50',  '1 day',  'user_id',     'created_at'),
    ('user_quotes',         '200', '1 hour', 'user_id',     'created_at'),
    ('user_favorite_books', '100', '1 hour', 'user_id',     'created_at'),
    ('user_books',          '5000','1 hour', 'user_id',     'added_at'),
    ('analytics_events',    '1000','1 hour', 'user_id',     'created_at'),
    ('books',               '5000','1 hour', 'created_by',  'created_at')
  ) as t(tbl, mx, win, owner_col, time_col)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_rate_limit', r.tbl);
    execute format('create trigger %I before insert on public.%I for each row execute function private.enforce_rate_limit(%L, %L, %L, %L)',
                   r.tbl || '_rate_limit', r.tbl, r.mx, r.win, r.owner_col, r.time_col);
  end loop;
end;
$$;

-- ------------------------------------------------------- 2. Edge Function guard
create table if not exists public.edge_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  fn text not null,
  created_at timestamptz not null default now()
);
create index if not exists edge_calls_user_idx on public.edge_calls (user_id, fn, created_at desc);
alter table public.edge_calls enable row level security;

insert into public.app_config (key, value) values ('kobo_import_enabled', 'true') on conflict (key) do nothing;

-- Call first thing in an Edge Function, with the reader's session.
create or replace function public.begin_edge_call(p_fn text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cap int := case p_fn when 'kobo_import' then 10 else null end;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_cap is null then raise exception 'unknown_function' using errcode = '22023'; end if;
  if not coalesce((private.config(p_fn || '_enabled'))::boolean, true) then
    raise exception 'feature_paused' using errcode = 'P0503';
  end if;
  if coalesce((private.config('writes_paused'))::boolean, false) then
    raise exception 'writes_paused' using errcode = 'P0503';
  end if;
  perform pg_advisory_xact_lock(hashtext('edge:' || p_fn || ':' || v_user::text));
  if (select count(*) from public.edge_calls where user_id = v_user and fn = p_fn and created_at > now() - interval '1 hour') >= v_cap then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.edge_calls (user_id, fn) values (v_user, p_fn);
end;
$$;
revoke all on function public.begin_edge_call(text) from public, anon;
grant execute on function public.begin_edge_call(text) to authenticated;

-- ------------------------------------------------------- 3. Least privilege
-- Signed-out visitors: only the app switches (maintenance screen) and the
-- username check on the sign-up form.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.app_config to anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;
grant execute on function public.is_username_available(text) to anon;

-- Signed-in readers: no direct writes to tables only the server writes.
do $$
declare t text;
begin
  foreach t in array array[
    'achievements', 'authors', 'book_authors', 'book_editions', 'book_genres', 'book_identifiers', 'books',
    'clue_sets', 'corner_items', 'corner_purchases', 'conversation_reads', 'conversations', 'daily_activity',
    'daily_challenge_solutions', 'daily_challenges', 'edge_calls', 'focus_sessions', 'game_answers', 'game_attempts',
    'genres', 'house_changes', 'house_points', 'house_ritual_entries', 'house_seasons', 'houses', 'invite_codes',
    'invite_redemptions', 'point_grants', 'point_redemptions', 'point_rewards', 'quiz_questions', 'sorting_results',
    'user_achievements', 'user_game_statistics', 'user_items', 'user_statistics', 'user_streaks', 'wheel_spins',
    'xp_transactions', 'app_config', 'market_alerts', 'market_listings', 'trade_offers'
  ] loop
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
  end loop;
end;
$$;
-- Game answers and the server's bookkeeping are never read directly.
revoke select on public.daily_challenge_solutions, public.clue_sets, public.quiz_questions, public.edge_calls from authenticated;
-- Notifications are created by the server; readers only mark them read or delete them.
revoke insert on public.notifications from authenticated;
-- Scan candidates are written by the scanner; readers only review them.
revoke insert on public.scan_candidates from authenticated;
-- The Market was retired.
revoke execute on function public.respond_trade(uuid, boolean) from authenticated;
