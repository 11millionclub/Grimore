-- House Cup standings are computed live (no 15-minute delay): points land in
-- the ledger the moment a game ends and the standings read them straight away.
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
      group by g.user_id having count(distinct g.challenge_date) >= 3
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
