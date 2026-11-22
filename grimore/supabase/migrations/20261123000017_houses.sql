-- Grimore Houses: the four orders of the library, the Sorting, the House Cup.
--
-- Rules that live here, on the server, so no client can bend them:
--   * House points come only from finished daily games (never from reading
--     logs, reviews or purchases), at most 175 per reader per day.
--   * A reader's House changes only through submit_sorting / change_house:
--     once at the reveal, then once in the 7 days after each season ends.
--   * Birth dates are private (owner-only table). Under 13 cannot finish
--     onboarding; 13 to 15 cannot use DMs, the Market or paid communities.

-- ---------------------------------------------------------------- Houses
create table public.houses (
  id text primary key check (id in ('lantern', 'quill', 'thorn', 'hourglass')),
  name text not null,
  member_name text not null,
  i18n_prefix text not null,
  color_token text not null,
  sigil text not null,
  rival_id text,
  sort_order smallint not null
);
insert into public.houses (id, name, member_name, i18n_prefix, color_token, sigil, rival_id, sort_order) values
  ('lantern',   'Lantern',   'Wayfinders',  'houses.lantern',   'house-lantern',   'moth',      'hourglass', 1),
  ('quill',     'Quill',     'Scribes',     'houses.quill',     'house-quill',     'quill',     'thorn',     2),
  ('thorn',     'Thorn',     'Thornhearts', 'houses.thorn',     'house-thorn',     'rose',      'quill',     3),
  ('hourglass', 'Hourglass', 'Keepers',     'houses.hourglass', 'house-hourglass', 'hourglass', 'lantern',   4);
alter table public.houses add constraint houses_rival_fkey foreign key (rival_id) references public.houses(id);
alter table public.houses enable row level security;
create policy "houses are public" on public.houses for select using (true);

-- ------------------------------------------------------ Private profile
create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null check (birth_date > date '1900-01-01'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;
create policy "own private profile read" on public.profile_private for select using (user_id = (select auth.uid()));
create policy "own private profile insert" on public.profile_private for insert with check (user_id = (select auth.uid()));
create policy "own private profile update" on public.profile_private for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function private.age_years(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select extract(year from age(public.utc_today(), birth_date))::int from public.profile_private where user_id = p_user;
$$;

create or replace function private.is_minor(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.age_years(p_user) < 16, false);
$$;

create or replace function private.check_birth_date() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.birth_date > public.utc_today() - interval '13 years' then
    raise exception 'too_young' using errcode = 'P0001', hint = 'Grimore is for readers aged 13 and over.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profile_private_age before insert or update on public.profile_private
  for each row execute function private.check_birth_date();

-- Readers can ask whether they are in the 13-15 band (to hide features), never others.
create or replace function public.my_age_band() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when private.age_years(auth.uid()) is null then 'unknown'
    when private.age_years(auth.uid()) < 16 then 'teen'
    else 'adult' end;
$$;

-- ---------------------------------------------------- Profile House fields
alter table public.profiles
  add column if not exists house_id text references public.houses(id),
  add column if not exists house_hidden boolean not null default false,
  add column if not exists house_assigned_at timestamptz;

create or replace function private.guard_house() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.house_id is distinct from old.house_id or new.house_assigned_at is distinct from old.house_assigned_at)
     and coalesce(current_setting('grimore.house_rpc', true), '') <> 'on' then
    raise exception 'house_change_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_house before update on public.profiles
  for each row execute function private.guard_house();

-- Onboarding answers that shape the app (catalogue, Home order, filters).
alter table public.user_preferences
  add column if not exists reading_languages text[] not null default '{}',
  add column if not exists reading_formats text[] not null default '{}',
  add column if not exists intents text[] not null default '{}',
  add column if not exists content_warnings text[] not null default '{}';

-- ---------------------------------------------------------------- Seasons
create table public.house_seasons (
  id int generated always as identity primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  winner_house_id text references public.houses(id)
);
alter table public.house_seasons enable row level security;
create policy "seasons are public" on public.house_seasons for select using (true);
insert into public.house_seasons (name, starts_at, ends_at)
values ('Season 1', timestamptz '2026-11-23 00:00+00', timestamptz '2026-11-23 00:00+00' + interval '84 days');

create or replace function private.current_season() returns int
language sql stable security definer set search_path = '' as $$
  select id from public.house_seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1;
$$;

-- --------------------------------------------------------- Sorting results
create table public.sorting_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null,
  scores jsonb not null,
  house_id text not null references public.houses(id),
  tie_break_used boolean not null default false,
  chosen_from_top_two boolean not null default false,
  skipped boolean not null default false,
  created_at timestamptz not null default now()
);
create index sorting_results_user_idx on public.sorting_results (user_id, created_at desc);
alter table public.sorting_results enable row level security;
create policy "own sorting results" on public.sorting_results for select using (user_id = (select auth.uid()));

create table public.house_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_house text references public.houses(id),
  to_house text not null references public.houses(id),
  season_id int references public.house_seasons(id),
  reason text not null check (reason in ('initial', 'reveal', 'season_window')),
  created_at timestamptz not null default now()
);
-- One change per season-end window.
create unique index house_changes_one_per_window on public.house_changes (user_id, season_id) where reason = 'season_window';
-- One "Not you?" change at the reveal.
create unique index house_changes_one_reveal on public.house_changes (user_id) where reason = 'reveal';
alter table public.house_changes enable row level security;
create policy "own house changes" on public.house_changes for select using (user_id = (select auth.uid()));

create or replace function private.assign_house(p_user uuid, p_house text, p_reason text, p_season int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_from text;
begin
  select house_id into v_from from public.profiles where id = p_user for update;
  perform set_config('grimore.house_rpc', 'on', true);
  update public.profiles set house_id = p_house, house_assigned_at = now() where id = p_user;
  perform set_config('grimore.house_rpc', '', true);
  insert into public.house_changes (user_id, from_house, to_house, season_id, reason) values (p_user, v_from, p_house, p_season, p_reason);
end;
$$;

-- Scores the eight answers on the server (2 points each) and assigns the House.
-- p_answers: {"q1": "lantern", ...}. With no answers, the reader chose by hand (p_choice).
create or replace function public.submit_sorting(p_answers jsonb, p_tie_break text default null, p_choice text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_scores jsonb;
  v_ranked text[];
  v_top int;
  v_second int;
  v_tied text[];
  v_house text;
  v_tie boolean := false;
  v_two boolean := false;
  v_skipped boolean := false;
  v_key text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if (select house_id from public.profiles where id = v_user) is not null then
    raise exception 'house_already_set' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profile_private where user_id = v_user) then
    raise exception 'birth_date_required' using errcode = 'P0001';
  end if;

  if p_answers is null or p_answers = '{}'::jsonb then
    if p_choice is null or p_choice not in (select id from public.houses) then raise exception 'invalid_choice' using errcode = '22023'; end if;
    v_skipped := true;
    v_house := p_choice;
    v_scores := jsonb_build_object('lantern', 0, 'quill', 0, 'thorn', 0, 'hourglass', 0);
  else
    if jsonb_typeof(p_answers) <> 'object' or (select count(*) from jsonb_object_keys(p_answers)) <> 8 then
      raise exception 'invalid_answers' using errcode = '22023';
    end if;
    for v_key in select jsonb_object_keys(p_answers) loop
      if v_key not in ('q1','q2','q3','q4','q5','q6','q7','q8') or (p_answers ->> v_key) not in (select id from public.houses) then
        raise exception 'invalid_answers' using errcode = '22023';
      end if;
    end loop;
    select jsonb_object_agg(h.id, 2 * (select count(*) from jsonb_each_text(p_answers) a where a.value = h.id)) into v_scores from public.houses h;
    select array_agg(k order by v desc, k) into v_ranked from (select key k, value::int v from jsonb_each_text(v_scores)) s;
    v_top := (v_scores ->> v_ranked[1])::int;
    v_second := (v_scores ->> v_ranked[2])::int;
    select array_agg(key) into v_tied from jsonb_each_text(v_scores) where value::int = v_top;
    if array_length(v_tied, 1) > 1 then
      if p_tie_break is null or not (p_tie_break = any (v_tied)) then raise exception 'tie_break_required' using errcode = 'P0001'; end if;
      v_house := p_tie_break;
      v_tie := true;
    elsif v_top - v_second <= 2 then
      if p_choice is null or p_choice not in (v_ranked[1], v_ranked[2]) then raise exception 'choice_required' using errcode = 'P0001'; end if;
      v_house := p_choice;
      v_two := true;
    else
      v_house := v_ranked[1];
    end if;
  end if;

  insert into public.sorting_results (user_id, answers, scores, house_id, tie_break_used, chosen_from_top_two, skipped)
  values (v_user, coalesce(p_answers, '{}'::jsonb), v_scores, v_house, v_tie, v_two, v_skipped);
  perform private.assign_house(v_user, v_house, 'initial', private.current_season());
  return jsonb_build_object('house', v_house, 'scores', v_scores, 'tie_break', v_tie, 'top_two', v_two);
end;
$$;

-- "Not you?" right after the reveal (within an hour, once), or once in the
-- 7 days after a season ends.
create or replace function public.change_house(p_house text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  p public.profiles;
  v_window int;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_house not in (select id from public.houses) then raise exception 'invalid_choice' using errcode = '22023'; end if;
  select * into p from public.profiles where id = v_user;
  if p.house_id is null then raise exception 'no_house_yet' using errcode = 'P0001'; end if;
  if p.house_id = p_house then return p_house; end if;
  if p.house_assigned_at > now() - interval '1 hour'
     and not exists (select 1 from public.house_changes where user_id = v_user and reason = 'reveal') then
    perform private.assign_house(v_user, p_house, 'reveal', private.current_season());
    return p_house;
  end if;
  select id into v_window from public.house_seasons where now() >= ends_at and now() < ends_at + interval '7 days' order by ends_at desc limit 1;
  if v_window is null then raise exception 'house_change_locked' using errcode = 'P0001', hint = 'You can change House in the week after a season ends.'; end if;
  if exists (select 1 from public.house_changes where user_id = v_user and season_id = v_window and reason = 'season_window') then
    raise exception 'house_change_used' using errcode = 'P0001';
  end if;
  perform private.assign_house(v_user, p_house, 'season_window', v_window);
  return p_house;
end;
$$;

-- Share of each House among readers sorted in the last 30 days (soft balance hint).
create or replace function public.house_balance() returns table (house_id text, share numeric)
language sql stable security definer set search_path = '' as $$
  with recent as (select to_house from public.house_changes where reason = 'initial' and created_at > now() - interval '30 days')
  select h.id, coalesce(round((select count(*) from recent where to_house = h.id)::numeric / nullif((select count(*) from recent), 0), 3), 0)
  from public.houses h;
$$;

-- ------------------------------------------------------------- Points ledger
create table public.house_points (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- null for House-level awards (weekly duel)
  house_id text not null references public.houses(id),
  season_id int not null references public.house_seasons(id),
  action text not null check (action in ('play', 'solve', 'placement', 'all_four', 'streak', 'duel', 'flagged')),
  points int not null check (points between 0 and 100),
  source_id text not null,
  created_at timestamptz not null default now()
);
create unique index house_points_once on public.house_points (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), action, source_id);
create index house_points_season_idx on public.house_points (season_id, house_id);
create index house_points_user_day_idx on public.house_points (user_id, created_at);
alter table public.house_points enable row level security;
create policy "own house points" on public.house_points for select using (user_id = (select auth.uid()));

-- Adds points for one reader, never past 175 in a UTC day.
create or replace function private.add_points(p_user uuid, p_house text, p_season int, p_action text, p_points int, p_source text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_today int;
begin
  select coalesce(sum(points), 0) into v_today from public.house_points
   where user_id = p_user and created_at >= public.utc_today()::timestamptz and created_at < public.utc_today()::timestamptz + interval '1 day';
  insert into public.house_points (user_id, house_id, season_id, action, points, source_id)
  values (p_user, p_house, p_season, p_action, greatest(0, least(p_points, 175 - v_today)), p_source)
  on conflict do nothing;
end;
$$;

-- Daily-game streak: consecutive UTC days, up to today, with a finished game.
create or replace function private.game_streak(p_user uuid) returns int
language plpgsql stable security definer set search_path = '' as $$
declare d date := public.utc_today(); n int := 0;
begin
  while exists (select 1 from public.game_attempts where user_id = p_user and challenge_date = d and status <> 'in_progress') loop
    n := n + 1;
    d := d - 1;
  end loop;
  return n;
end;
$$;

-- Fires when a daily game finishes. The server timed the game; the client never sends a score.
create or replace function private.award_game_points() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_house text;
  v_joined timestamptz;
  v_season int := private.current_season();
  v_elapsed numeric;
  v_day text := new.challenge_date::text;
begin
  if v_season is null or not private.is_v2_game(new.game) then return new; end if;
  select house_id, created_at into v_house, v_joined from public.profiles where id = new.user_id;
  if v_house is null then return new; end if;
  -- New accounts start earning on their third day.
  if v_joined::date > public.utc_today() - 2 then return new; end if;

  perform private.add_points(new.user_id, v_house, v_season, 'play', 10, new.id::text);
  if new.status = 'won' then
    v_elapsed := extract(epoch from coalesce(new.completed_at, now()) - new.started_at);
    if v_elapsed < 3 then
      insert into public.house_points (user_id, house_id, season_id, action, points, source_id)
      values (new.user_id, v_house, v_season, 'flagged', 0, new.id::text) on conflict do nothing;
    else
      perform private.add_points(new.user_id, v_house, v_season, 'solve', 10, new.id::text);
    end if;
  end if;
  if (select count(distinct game) from public.game_attempts
       where user_id = new.user_id and challenge_date = new.challenge_date and status <> 'in_progress' and private.is_v2_game(game)) >= 4 then
    perform private.add_points(new.user_id, v_house, v_season, 'all_four', 15, new.user_id::text || ':' || v_day);
  end if;
  perform private.add_points(new.user_id, v_house, v_season, 'streak', least(20, 2 * private.game_streak(new.user_id)), new.user_id::text || ':' || v_day);
  return new;
end;
$$;
create trigger game_attempts_house_points after update of status on public.game_attempts
  for each row when (old.status = 'in_progress' and new.status <> 'in_progress')
  execute function private.award_game_points();

-- Yesterday's placement among all players (top 10 / 25 / 50 %).
create or replace function private.award_placements(p_day date) returns void
language plpgsql security definer set search_path = '' as $$
declare r record; v_season int;
begin
  select id into v_season from public.house_seasons where p_day::timestamptz >= starts_at and p_day::timestamptz < ends_at limit 1;
  if v_season is null then return; end if;
  for r in
    with finished as (
      select a.id, a.user_id, a.challenge_id, a.status, a.time_seconds,
             count(*) over (partition by a.challenge_id) as players
      from public.game_attempts a where a.challenge_date = p_day and a.status <> 'in_progress' and private.is_v2_game(a.game)
    ), ranked as (
      select f.*, rank() over (partition by f.challenge_id order by f.time_seconds) as place
      from finished f where f.status = 'won'
    )
    select r.id, r.user_id, p.house_id, r.place::numeric / r.players as pct
    from ranked r join public.profiles p on p.id = r.user_id
    where p.house_id is not null and p.created_at::date <= p_day - 2
      and not exists (select 1 from public.house_points hp where hp.action = 'flagged' and hp.source_id = r.id::text)
  loop
    if r.pct <= 0.10 then perform private.add_points(r.user_id, r.house_id, v_season, 'placement', 15, r.id::text);
    elsif r.pct <= 0.25 then perform private.add_points(r.user_id, r.house_id, v_season, 'placement', 10, r.id::text);
    elsif r.pct <= 0.50 then perform private.add_points(r.user_id, r.house_id, v_season, 'placement', 5, r.id::text);
    end if;
  end loop;
end;
$$;

-- Weekly duel between rival Houses: solved games per active member that week.
create or replace function private.award_duels(p_week_start date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_season int;
  v_pair text[];
  a numeric; b numeric;
begin
  select id into v_season from public.house_seasons where p_week_start::timestamptz >= starts_at and p_week_start::timestamptz < ends_at limit 1;
  if v_season is null then return; end if;
  foreach v_pair slice 1 in array array[array['lantern','hourglass'], array['quill','thorn']] loop
    select coalesce(sum(case when g.status = 'won' then 1 else 0 end)::numeric / nullif(count(distinct g.user_id), 0), 0) into a
      from public.game_attempts g join public.profiles p on p.id = g.user_id
     where p.house_id = v_pair[1] and g.challenge_date >= p_week_start and g.challenge_date < p_week_start + 7 and g.status <> 'in_progress';
    select coalesce(sum(case when g.status = 'won' then 1 else 0 end)::numeric / nullif(count(distinct g.user_id), 0), 0) into b
      from public.game_attempts g join public.profiles p on p.id = g.user_id
     where p.house_id = v_pair[2] and g.challenge_date >= p_week_start and g.challenge_date < p_week_start + 7 and g.status <> 'in_progress';
    if a <> b then
      insert into public.house_points (user_id, house_id, season_id, action, points, source_id)
      values (null, case when a > b then v_pair[1] else v_pair[2] end, v_season, 'duel', 50, 'duel:' || p_week_start || ':' || v_pair[1] || '-' || v_pair[2])
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- -------------------------------------------------------------- Standings
create materialized view private.house_standings as
with seasons as (select id, starts_at, ends_at from public.house_seasons),
active as (
  select s.id as season_id, p.house_id, count(*) as active_members
  from seasons s
  join lateral (
    select g.user_id from public.game_attempts g
    where g.challenge_date >= s.starts_at::date and g.challenge_date < s.ends_at::date and g.status <> 'in_progress'
    group by g.user_id having count(distinct g.challenge_date) >= 3
  ) u on true
  join public.profiles p on p.id = u.user_id and p.house_id is not null
  group by s.id, p.house_id
),
pts as (select season_id, house_id, sum(points) as points from public.house_points group by 1, 2),
members as (select house_id, count(*) as members from public.profiles where house_id is not null group by 1)
select s.id as season_id, h.id as house_id,
       coalesce(pts.points, 0)::bigint as points,
       coalesce(active.active_members, 0)::int as active_members,
       coalesce(members.members, 0)::int as members,
       round(coalesce(pts.points, 0)::numeric / greatest(coalesce(active.active_members, 0), 1), 1) as points_per_member
from seasons s cross join public.houses h
left join pts on pts.season_id = s.id and pts.house_id = h.id
left join active on active.season_id = s.id and active.house_id = h.id
left join members on members.house_id = h.id;
create unique index house_standings_pk on private.house_standings (season_id, house_id);

create or replace function public.get_house_standings(p_season int default null)
returns table (season_id int, house_id text, points bigint, active_members int, members int, points_per_member numeric)
language sql stable security definer set search_path = '' as $$
  select s.season_id, s.house_id, s.points, s.active_members, s.members, s.points_per_member
  from private.house_standings s
  where s.season_id = coalesce(p_season, private.current_season())
  order by s.points_per_member desc, s.house_id;
$$;

-- My season so far: points, by action.
create or replace function public.my_house_points(p_season int default null)
returns table (action text, points bigint)
language sql stable security definer set search_path = '' as $$
  select action, sum(points)::bigint from public.house_points
  where user_id = auth.uid() and season_id = coalesce(p_season, private.current_season())
  group by action;
$$;

-- Daily housekeeping: placements for yesterday, close a finished season and open the next.
create or replace function private.house_daily() returns void
language plpgsql security definer set search_path = '' as $$
declare s public.house_seasons;
begin
  perform private.award_placements(public.utc_today() - 1);
  for s in select * from public.house_seasons where ends_at <= now() and winner_house_id is null loop
    refresh materialized view private.house_standings;
    update public.house_seasons set winner_house_id = (
      select house_id from private.house_standings where season_id = s.id and points > 0 order by points_per_member desc limit 1
    ) where id = s.id;
    if not exists (select 1 from public.house_seasons where starts_at >= s.ends_at) then
      insert into public.house_seasons (name, starts_at, ends_at)
      values ('Season ' || (s.id + 1), s.ends_at, s.ends_at + interval '84 days');
    end if;
  end loop;
end;
$$;

select cron.schedule('house-standings', '*/15 * * * *', $$refresh materialized view concurrently private.house_standings$$);
select cron.schedule('house-daily', '10 0 * * *', $$select private.house_daily()$$);
select cron.schedule('house-duel', '20 0 * * 1', $$select private.award_duels(public.utc_today() - 7)$$);

-- ------------------------------------------------- Age-based restrictions
create or replace function private.block_minors() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.is_minor(auth.uid()) then
    raise exception 'not_available_under_16' using errcode = 'P0001', hint = 'Messages, the Market and paid communities open at 16.';
  end if;
  return new;
end;
$$;
create trigger messages_minors before insert on public.messages for each row execute function private.block_minors();
create trigger market_listings_minors before insert on public.market_listings for each row execute function private.block_minors();
create trigger trade_offers_minors before insert on public.trade_offers for each row execute function private.block_minors();

create or replace function private.block_minor_conversations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.is_minor(new.user_a) or private.is_minor(new.user_b) then
    raise exception 'not_available_under_16' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger conversations_minors before insert on public.conversations for each row execute function private.block_minor_conversations();

create or replace function private.block_minor_paid_communities() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.is_minor(new.user_id) and coalesce((select price_cents from public.communities where id = new.community_id), 0) > 0 then
    raise exception 'not_available_under_16' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger community_members_minors before insert on public.community_members for each row execute function private.block_minor_paid_communities();

-- Execute rights: the public RPCs for signed-in readers only; private helpers for nobody.
revoke all on function public.submit_sorting(jsonb, text, text), public.change_house(text), public.house_balance(),
  public.get_house_standings(int), public.my_house_points(int), public.my_age_band() from public, anon;
grant execute on function public.submit_sorting(jsonb, text, text), public.change_house(text), public.house_balance(),
  public.get_house_standings(int), public.my_house_points(int), public.my_age_band() to authenticated;
