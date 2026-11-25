-- GriMore — House Cup: "active" members are the ones who earned points for
-- their House this season, and the weekly duel uses the same scoring as the
-- standings (points per contributing member), over the week.

-- Points and contributors of one House in a window. Contributors are readers
-- who are in the House now and earned it points in that window.
create or replace function private.house_score(p_house text, p_season int, p_from timestamptz default '-infinity', p_to timestamptz default 'infinity', p_skip_duels boolean default false)
returns table(points bigint, contributors int)
language sql stable security definer set search_path = '' as $$
  with hp as (
    select h.user_id, h.points from public.house_points h
    where h.house_id = p_house and h.season_id = p_season
      and h.created_at >= p_from and h.created_at < p_to
      and (not p_skip_duels or h.action <> 'duel')
  ),
  people as (
    select hp.user_id from hp join public.profiles p on p.id = hp.user_id and p.house_id = p_house
    group by hp.user_id having sum(hp.points) > 0
  )
  select coalesce((select sum(points) from hp), 0)::bigint, (select count(*) from people)::int;
$$;
revoke all on function private.house_score(text, int, timestamptz, timestamptz, boolean) from public, anon, authenticated;

create or replace function public.get_house_standings(p_season integer default null)
returns table(season_id integer, house_id text, points bigint, active_members integer, members integer, points_per_member numeric)
language sql stable security definer set search_path = '' as $$
  with s as (
    select id from public.house_seasons
    where id = coalesce(p_season, private.current_season(),
                        (select id from public.house_seasons where starts_at > now() order by starts_at limit 1))
  ),
  members as (select pr.house_id, count(*) as n from public.profiles pr where pr.house_id is not null group by pr.house_id)
  select s.id, h.id, sc.points, sc.contributors, coalesce(m.n, 0)::int,
         round(sc.points::numeric / greatest(sc.contributors, 1), 1)
  from s cross join public.houses h
  cross join lateral private.house_score(h.id, s.id) sc
  left join members m on m.house_id = h.id
  order by 6 desc, 2;
$$;

-- This week's duel: points earned this week per contributing member (the
-- duel bonus itself does not count).
drop function if exists public.house_duels();
create function public.house_duels()
returns table(house_id text, rival_id text, points bigint, contributors integer, points_per_member numeric)
language sql stable security definer set search_path = '' as $$
  with wk as (select date_trunc('week', public.utc_today()::timestamptz) as start),
  s as (select private.current_season() as id)
  select h.id, h.rival_id, sc.points, sc.contributors, round(sc.points::numeric / greatest(sc.contributors, 1), 1)
  from public.houses h, wk, s
  cross join lateral private.house_score(h.id, s.id, wk.start, wk.start + interval '7 days', true) sc;
$$;
revoke all on function public.house_duels() from public, anon;
grant execute on function public.house_duels() to authenticated;

create or replace function private.award_duels(p_week_start date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_season int;
  v_pair text[];
  a numeric; b numeric;
begin
  select id into v_season from public.house_seasons where p_week_start::timestamptz >= starts_at and p_week_start::timestamptz < ends_at limit 1;
  if v_season is null then return; end if;
  foreach v_pair slice 1 in array array[array['lantern','hourglass'], array['quill','thorn']] loop
    select sc.points::numeric / greatest(sc.contributors, 1) into a from private.house_score(v_pair[1], v_season, p_week_start::timestamptz, p_week_start::timestamptz + interval '7 days', true) sc;
    select sc.points::numeric / greatest(sc.contributors, 1) into b from private.house_score(v_pair[2], v_season, p_week_start::timestamptz, p_week_start::timestamptz + interval '7 days', true) sc;
    if a <> b then
      insert into public.house_points (user_id, house_id, season_id, action, points, source_id)
      values (null, case when a > b then v_pair[1] else v_pair[2] end, v_season, 'duel', 50, 'duel:' || p_week_start || ':' || v_pair[1] || '-' || v_pair[2])
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- The season winner uses the same standings as the screen.
create or replace function private.house_daily()
returns void language plpgsql security definer set search_path = '' as $$
declare s public.house_seasons;
begin
  perform private.award_placements(public.utc_today() - 1);
  for s in select * from public.house_seasons where ends_at <= now() and winner_house_id is null loop
    update public.house_seasons set winner_house_id = (
      select g.house_id from public.get_house_standings(s.id) g where g.points > 0 order by g.points_per_member desc limit 1
    ) where id = s.id;
    perform private.close_season(s.id);
    if not exists (select 1 from public.house_seasons where starts_at >= s.ends_at) then
      insert into public.house_seasons (name, starts_at, ends_at)
      values ('Season ' || (s.id + 1), s.ends_at, s.ends_at + interval '84 days');
    end if;
  end loop;
end;
$$;

-- Everyone who earned points for a House this season. Readers who hid their
-- House are counted but not named; points show only for readers who opted in
-- to the leaderboard.
create or replace function public.house_contributors(p_house text, p_season int default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with s as (select coalesce(p_season, private.current_season()) as id),
  per as (
    select hp.user_id, sum(hp.points)::bigint as pts
    from public.house_points hp, s
    where hp.house_id = p_house and hp.season_id = s.id and hp.user_id is not null
    group by hp.user_id having sum(hp.points) > 0
  ),
  rows as (
    select per.*, p.username, p.display_name, p.avatar_url, p.house_hidden,
           coalesce(up.house_leaderboard_opt_in, false) as opt_in
    from per join public.profiles p on p.id = per.user_id and p.house_id = p_house
    left join public.user_preferences up on up.user_id = p.id
    where not private.is_blocked_between(p.id, auth.uid())
  )
  select jsonb_build_object(
    'total', (select count(*) from rows),
    'hidden', (select count(*) from rows where house_hidden and user_id <> auth.uid()),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', user_id, 'username', username, 'display_name', display_name, 'avatar_url', avatar_url,
                                          'points', case when opt_in or user_id = auth.uid() then pts end)
                       order by (opt_in or user_id = auth.uid()) desc, case when opt_in or user_id = auth.uid() then pts end desc nulls last, username)
      from rows where not house_hidden or user_id = auth.uid()), '[]'::jsonb));
$$;
revoke all on function public.house_contributors(text, int) from public, anon;
grant execute on function public.house_contributors(text, int) to authenticated;
