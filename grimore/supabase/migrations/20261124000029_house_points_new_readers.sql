-- GriMore — House points for new readers and a fair "active member" count.
--
-- 1. New accounts earn House points from their first game. The old rule
--    (earning from the third day) left a new reader who played on day one
--    with nothing for their House or their wallet.
-- 2. Placements follow the same rule.
-- 3. "Active member" needs 3 playing days in the season, or every day so far
--    while the season is younger than 3 days (otherwise every House showed
--    0 active members at the start of a season).
-- 4. Backfill: finished daily games in the current season that earned no
--    points (because of the old rule, or because the reader was sorted
--    afterwards) get their play / solve / all-four points now, dated when the
--    game ended. Streak and placement bonuses are not replayed.

create or replace function private.award_game_points() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_house text;
  v_season int := private.current_season();
  v_elapsed numeric;
  v_day text := new.challenge_date::text;
begin
  if v_season is null or not private.is_v2_game(new.game) then return new; end if;
  select house_id into v_house from public.profiles where id = new.user_id;
  if v_house is null then return new; end if;

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
    where p.house_id is not null
      and not exists (select 1 from public.house_points hp where hp.action = 'flagged' and hp.source_id = r.id::text)
  loop
    if r.pct <= 0.10 then perform private.add_points(r.user_id, r.house_id, v_season, 'placement', 15, r.id::text);
    elsif r.pct <= 0.25 then perform private.add_points(r.user_id, r.house_id, v_season, 'placement', 10, r.id::text);
    elsif r.pct <= 0.50 then perform private.add_points(r.user_id, r.house_id, v_season, 'placement', 5, r.id::text);
    end if;
  end loop;
end;
$$;


create or replace function public.get_house_standings(p_season int default null)
returns table (season_id int, house_id text, points bigint, active_members int, members int, points_per_member numeric)
language sql stable security definer set search_path = '' as $$
  with s as (
    select id, starts_at, ends_at from public.house_seasons
    where id = coalesce(p_season, private.current_season(),
                        (select id from public.house_seasons where starts_at > now() order by starts_at limit 1))
  ),
  active as (
    select p.house_id, count(*) as n
    from s
    join lateral (
      select g.user_id from public.game_attempts g
      where g.challenge_date >= s.starts_at::date and g.challenge_date < s.ends_at::date and g.status <> 'in_progress'
      group by g.user_id
      -- 3 playing days, or every day so far in a season younger than 3 days.
      having count(distinct g.challenge_date) >= least(3, greatest(1, least(now(), s.ends_at)::date - s.starts_at::date + 1))
    ) u on true
    join public.profiles p on p.id = u.user_id and p.house_id is not null
    group by p.house_id
  ),
  pts as (select hp.house_id, sum(hp.points) as total from public.house_points hp, s where hp.season_id = s.id group by hp.house_id),
  members as (select pr.house_id, count(*) as n from public.profiles pr where pr.house_id is not null group by pr.house_id)
  select s.id, h.id, coalesce(pts.total, 0)::bigint, coalesce(active.n, 0)::int, coalesce(members.n, 0)::int,
         round(coalesce(pts.total, 0)::numeric / greatest(coalesce(active.n, 0), 1), 1)
  from s cross join public.houses h
  left join pts on pts.house_id = h.id
  left join active on active.house_id = h.id
  left join members on members.house_id = h.id
  order by 6 desc, 2;
$$;

-- ------------------------------------------------------------- Backfill
do $$
declare v_season int := private.current_season();
begin
  if v_season is null then return; end if;

  insert into public.house_points (user_id, house_id, season_id, action, points, source_id, created_at)
  select a.user_id, p.house_id, v_season, 'play', 10, a.id::text, coalesce(a.completed_at, now())
  from public.game_attempts a
  join public.profiles p on p.id = a.user_id and p.house_id is not null
  join public.house_seasons s on s.id = v_season
  where a.status <> 'in_progress' and private.is_v2_game(a.game)
    and a.challenge_date >= s.starts_at::date and a.challenge_date < s.ends_at::date
  on conflict do nothing;

  insert into public.house_points (user_id, house_id, season_id, action, points, source_id, created_at)
  select a.user_id, p.house_id, v_season, 'solve', 10, a.id::text, coalesce(a.completed_at, now())
  from public.game_attempts a
  join public.profiles p on p.id = a.user_id and p.house_id is not null
  join public.house_seasons s on s.id = v_season
  where a.status = 'won' and private.is_v2_game(a.game)
    and a.challenge_date >= s.starts_at::date and a.challenge_date < s.ends_at::date
    and extract(epoch from coalesce(a.completed_at, now()) - a.started_at) >= 3
  on conflict do nothing;

  insert into public.house_points (user_id, house_id, season_id, action, points, source_id, created_at)
  select a.user_id, p.house_id, v_season, 'all_four', 15, a.user_id::text || ':' || a.challenge_date::text, max(coalesce(a.completed_at, now()))
  from public.game_attempts a
  join public.profiles p on p.id = a.user_id and p.house_id is not null
  join public.house_seasons s on s.id = v_season
  where a.status <> 'in_progress' and private.is_v2_game(a.game)
    and a.challenge_date >= s.starts_at::date and a.challenge_date < s.ends_at::date
  group by a.user_id, p.house_id, a.challenge_date
  having count(distinct a.game) >= 4
  on conflict do nothing;
end;
$$;
