-- Houses, part 2: House items, Common Rooms, rituals, House Cup helpers and
-- the end of a season. Cosmetic items never touch points.

-- --------------------------------------------------------------- Items
alter table public.corner_items drop constraint corner_items_key_check;
alter table public.corner_items drop constraint corner_items_kind_check;
alter table public.corner_items
  add constraint corner_items_kind_check check (kind in ('theme', 'frame', 'shelf', 'name', 'pack', 'badge', 'icon', 'ribbon', 'laurel', 'card')),
  add constraint corner_items_key_check check (key ~ '^(theme|frame|shelf|name|pack|badge|icon|ribbon|laurel|card):[a-z0-9-]+$'),
  add column if not exists house_id text references public.houses(id),
  add column if not exists source text not null default 'shop' check (source in ('shop', 'starter', 'earned', 'paid'));

-- Starter kit (free, House-locked) and House collection (paid, cosmetic only).
insert into public.corner_items (key, kind, name, price_cents, sort_order, house_id, source)
select v.key, v.kind, v.name, v.price, v.sort, h.id, v.source
from public.houses h
cross join lateral (values
  ('theme:house-' || h.id, 'theme', h.name || ' banner', null::int, 100, 'starter'),
  ('frame:house-' || h.id, 'frame', h.name || ' frame', null, 100, 'starter'),
  ('name:house-' || h.id, 'name', h.name || ' name colour', null, 100, 'starter'),
  ('pack:house-' || h.id, 'pack', h.name || ' stickers', null, 100, 'starter'),
  ('badge:house-' || h.id, 'badge', h.name || ' badge', null, 100, 'starter'),
  ('icon:house-' || h.id, 'icon', h.name || ' app icon', null, 100, 'starter'),
  ('frame:house-' || h.id || '-animated', 'frame', 'Animated ' || h.name || ' frame', 299, 110, 'paid'),
  ('theme:house-' || h.id || '-premium-a', 'theme', case h.id when 'lantern' then 'Lantern: Midnight Map' when 'quill' then 'Quill: Marginalia' when 'thorn' then 'Thorn: Pressed Roses' else 'Hourglass: Copper Dusk' end, 199, 110, 'paid'),
  ('theme:house-' || h.id || '-premium-b', 'theme', case h.id when 'lantern' then 'Lantern: Ember Glow' when 'quill' then 'Quill: Ink and Vellum' when 'thorn' then 'Thorn: Velvet Night' else 'Hourglass: Sand Clock' end, 199, 111, 'paid'),
  ('pack:house-' || h.id || '-premium', 'pack', h.name || ' premium stickers', 199, 110, 'paid'),
  ('card:house-' || h.id || '-wrapped', 'card', h.name || ' Wrapped card', 199, 110, 'paid'),
  ('pack:house-' || h.id || '-bundle', 'pack', h.name || ' collection bundle', 499, 120, 'paid')
) as v(key, kind, name, price, sort, source)
on conflict (key) do nothing;

-- Earned items: never for sale, cannot be bought or gifted.
insert into public.corner_items (key, kind, name, price_cents, sort_order, source) values
  ('ribbon:season-bronze', 'ribbon', 'Bronze season ribbon', null, 200, 'earned'),
  ('ribbon:season-silver', 'ribbon', 'Silver season ribbon', null, 201, 'earned'),
  ('ribbon:season-gold', 'ribbon', 'Gold season ribbon', null, 202, 'earned'),
  ('laurel:cup-winner', 'laurel', 'Cup winner laurel', null, 203, 'earned'),
  ('badge:ritual-uncharted', 'badge', 'Uncharted', null, 210, 'earned'),
  ('badge:ritual-debate', 'badge', 'The Weekly Debate', null, 211, 'earned'),
  ('badge:ritual-heartbreak', 'badge', 'Heartbreak Club', null, 212, 'earned'),
  ('badge:ritual-marathon', 'badge', 'Midnight Marathon', null, 213, 'earned'),
  ('badge:founding', 'badge', 'Founding member', null, 220, 'earned')
on conflict (key) do nothing;

-- Ownership of earned (and, once payments open, paid) items. Written only by the server.
create table public.user_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null references public.corner_items(key) on delete cascade,
  source text not null check (source in ('earned', 'paid')),
  season_id int references public.house_seasons(id),
  acquired_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, item_key)
);
alter table public.user_items enable row level security;
create policy "own items" on public.user_items for select using (user_id = (select auth.uid()));
-- Others can see earned marks (ribbons, laurels, badges) on profiles.
create policy "earned marks are public" on public.user_items for select using (source = 'earned' and (expires_at is null or expires_at > now()));

-- Corner guard: House starter items only for that House; earned items only if earned; paid items only if bought.
create or replace function private.corners_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  it public.corner_items;
  v_house text;
begin
  select house_id into v_house from public.profiles where id = new.user_id;
  foreach v_key in array array['theme:' || new.theme, 'frame:' || new.frame, 'shelf:' || new.shelf,
                               'name:' || new.name_style, 'pack:' || new.pack]
  loop
    select * into it from public.corner_items where key = v_key;
    if not found then raise exception 'unknown_item %', v_key using errcode = '22023'; end if;
    if it.source = 'starter' and it.house_id is distinct from v_house then
      raise exception 'item_house_locked' using errcode = '42501';
    end if;
    if it.source = 'earned' and not exists (
      select 1 from public.user_items u where u.user_id = new.user_id and u.item_key = v_key and (u.expires_at is null or u.expires_at > now())
    ) then
      raise exception 'item_not_earned' using errcode = '42501';
    end if;
    if it.price_cents is not null and not exists (select 1 from public.corner_purchases where user_id = new.user_id and item_key = v_key)
       and not exists (select 1 from public.user_items u where u.user_id = new.user_id and u.item_key = v_key) then
      raise exception 'item_not_owned' using errcode = '42501', hint = 'Purchases are coming soon.';
    end if;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------- Common Rooms
alter table public.communities alter column host_id drop not null;
-- House Common Rooms have no host (moderated by the team), so only add a host when there is one.
create or replace function private.communities_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.host_id is not null then
    insert into public.community_members (community_id, user_id, role, tier)
    values (new.id, new.host_id, 'host', 'patron')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
alter table public.communities add column if not exists house_id text unique references public.houses(id);

insert into public.communities (slug, name, tagline, description, cover_scene, host_id, house_id, rules)
select 'house-' || h.id, h.name || ' Common Room',
       case h.id when 'lantern' then 'Read past the edge of the map.' when 'quill' then 'Every page deserves a reply.'
                 when 'thorn' then 'Feel all of it. Then read it again.' else 'One more chapter. Every night.' end,
       'The Common Room of House ' || h.name || '. Every ' || h.member_name || ' is a member. Banter is welcome; attacking people for their House is not.',
       case h.id when 'lantern' then 'moonlit-reading-room' when 'quill' then 'candlelit-study' when 'thorn' then 'elven-library' else 'great-hall' end,
       null, h.id, '{"spoiler_tags": true, "approve_members": false, "live_sessions": true}'::jsonb
from public.houses h
on conflict (slug) do nothing;

-- Only a House's members can join its Common Room (they are added automatically).
create or replace function private.guard_house_room() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_house text;
begin
  select house_id into v_house from public.communities where id = new.community_id;
  if v_house is not null and v_house is distinct from (select house_id from public.profiles where id = new.user_id) then
    raise exception 'house_room_members_only' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger community_members_house_room before insert on public.community_members
  for each row execute function private.guard_house_room();

-- Sorting and House changes: join the new Common Room, leave the old one,
-- drop the old House's starter items from the Corner, mark founding members.
create or replace function private.assign_house(p_user uuid, p_house text, p_reason text, p_season int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_from text;
begin
  select house_id into v_from from public.profiles where id = p_user for update;
  perform set_config('grimore.house_rpc', 'on', true);
  update public.profiles set house_id = p_house, house_assigned_at = now() where id = p_user;
  perform set_config('grimore.house_rpc', '', true);
  insert into public.house_changes (user_id, from_house, to_house, season_id, reason) values (p_user, v_from, p_house, p_season, p_reason);

  if v_from is not null then
    delete from public.community_members m using public.communities c
     where m.community_id = c.id and c.house_id = v_from and m.user_id = p_user;
    update public.corners set
      theme = case when theme like 'house-' || v_from || '%' and theme not like '%-premium-%' then 'forest' else theme end,
      frame = case when frame = 'house-' || v_from then 'ember' else frame end,
      name_style = case when name_style = 'house-' || v_from then 'plain' else name_style end,
      pack = case when pack = 'house-' || v_from then 'reader' else pack end
     where user_id = p_user;
  end if;
  insert into public.community_members (community_id, user_id, role, tier)
  select c.id, p_user, 'member', 'member' from public.communities c where c.house_id = p_house
  on conflict do nothing;

  if p_season = (select min(id) from public.house_seasons) then
    insert into public.user_items (user_id, item_key, source, season_id) values (p_user, 'badge:founding', 'earned', p_season)
    on conflict do nothing;
  end if;
end;
$$;

-- -------------------------------------------------------------- Rituals
create table public.house_ritual_entries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  house_id text not null references public.houses(id),
  period text not null check (period ~ '^\d{4}-(\d{2}|W\d{2})$'),
  status text not null default 'joined' check (status in ('joined', 'completed')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, period)
);
alter table public.house_ritual_entries enable row level security;
create policy "own ritual entries" on public.house_ritual_entries for select using (user_id = (select auth.uid()));

-- Monthly rituals use YYYY-MM; the Weekly Debate uses ISO weeks (YYYY-Www).
create or replace function private.ritual_period(p_house text) returns text
language sql stable set search_path = '' as $$
  select case when p_house = 'quill' then to_char(public.utc_today(), 'IYYY-"W"IW') else to_char(public.utc_today(), 'YYYY-MM') end;
$$;

create or replace function public.join_ritual() returns text
language plpgsql security definer set search_path = '' as $$
declare v_house text := (select house_id from public.profiles where id = auth.uid());
begin
  if v_house is null then raise exception 'no_house_yet' using errcode = 'P0001'; end if;
  insert into public.house_ritual_entries (user_id, house_id, period) values (auth.uid(), v_house, private.ritual_period(v_house))
  on conflict do nothing;
  return private.ritual_period(v_house);
end;
$$;

-- Rituals are honour-system (they are about reading); they earn a badge, never House points.
create or replace function public.complete_ritual() returns void
language plpgsql security definer set search_path = '' as $$
declare v_house text := (select house_id from public.profiles where id = auth.uid());
begin
  update public.house_ritual_entries set status = 'completed', completed_at = now()
   where user_id = auth.uid() and period = private.ritual_period(v_house) and status = 'joined';
  if not found then raise exception 'ritual_not_joined' using errcode = 'P0001'; end if;
  insert into public.user_items (user_id, item_key, source, season_id)
  values (auth.uid(), 'badge:ritual-' || case v_house when 'lantern' then 'uncharted' when 'quill' then 'debate' when 'thorn' then 'heartbreak' else 'marathon' end, 'earned', private.current_season())
  on conflict do nothing;
end;
$$;

create or replace function public.my_ritual() returns table (period text, status text)
language sql stable security definer set search_path = '' as $$
  select e.period, e.status from public.house_ritual_entries e
  join public.profiles p on p.id = e.user_id
  where e.user_id = auth.uid() and e.period = private.ritual_period(p.house_id);
$$;

-- ------------------------------------------------------ Cup helpers
alter table public.user_preferences add column if not exists house_leaderboard_opt_in boolean not null default false;

-- Top contributors this season, only readers who opted in.
create or replace function public.house_top_contributors(p_house text, p_limit int default 10)
returns table (user_id uuid, username text, display_name text, avatar_url text, points bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, sum(hp.points)::bigint
  from public.house_points hp
  join public.profiles p on p.id = hp.user_id
  join public.user_preferences up on up.user_id = p.id and up.house_leaderboard_opt_in
  where hp.season_id = private.current_season() and hp.house_id = p_house and p.house_id = p_house and not p.house_hidden
    and not private.is_blocked_between(p.id, auth.uid())
  group by p.id
  order by 5 desc
  limit least(p_limit, 25);
$$;

-- This week's rival duels: solved games per member who played this week.
create or replace function public.house_duels() returns table (house_id text, rival_id text, wins_per_member numeric, players int)
language sql stable security definer set search_path = '' as $$
  with wk as (select date_trunc('week', public.utc_today()::timestamptz)::date as start),
  stats as (
    select p.house_id, count(*) filter (where g.status = 'won') as wins, count(distinct g.user_id) as players
    from public.game_attempts g join public.profiles p on p.id = g.user_id, wk
    where p.house_id is not null and g.challenge_date >= wk.start and g.challenge_date < wk.start + 7 and g.status <> 'in_progress'
    group by p.house_id
  )
  select h.id, h.rival_id, round(coalesce(s.wins::numeric / nullif(s.players, 0), 0), 2), coalesce(s.players, 0)::int
  from public.houses h left join stats s on s.house_id = h.id;
$$;

-- My games this ISO week, for the weekly quest.
create or replace function public.my_week_games() returns table (game text, played int, solved int, days int)
language sql stable security definer set search_path = '' as $$
  select g.game::text, count(*)::int, count(*) filter (where g.status = 'won')::int, count(distinct g.challenge_date)::int
  from public.game_attempts g
  where g.user_id = auth.uid() and g.challenge_date >= date_trunc('week', public.utc_today()::timestamptz)::date and g.status <> 'in_progress'
  group by g.game;
$$;

-- Earned marks of any reader (for profiles).
create or replace function public.reader_marks(p_user uuid) returns table (item_key text, season_id int)
language sql stable security definer set search_path = '' as $$
  select item_key, season_id from public.user_items
  where user_id = p_user and source = 'earned' and (expires_at is null or expires_at > now())
    and not private.is_blocked_between(p_user, auth.uid());
$$;

-- ---------------------------------------------------- End of a season
-- Ribbons by personal contribution, laurels for the winning House (kept through the next season).
create or replace function private.close_season(p_season int) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.house_seasons;
begin
  select * into s from public.house_seasons where id = p_season;
  insert into public.user_items (user_id, item_key, source, season_id)
  select user_id,
         case when total >= 2500 then 'ribbon:season-gold' when total >= 1000 then 'ribbon:season-silver' else 'ribbon:season-bronze' end,
         'earned', p_season
  from (select user_id, sum(points) as total from public.house_points where season_id = p_season and user_id is not null group by user_id) t
  where total >= 300
  on conflict (user_id, item_key) do update set season_id = excluded.season_id, acquired_at = now();

  if s.winner_house_id is not null then
    insert into public.user_items (user_id, item_key, source, season_id, expires_at)
    select distinct hp.user_id, 'laurel:cup-winner', 'earned', p_season, s.ends_at + interval '84 days'
    from public.house_points hp
    where hp.season_id = p_season and hp.house_id = s.winner_house_id and hp.user_id is not null
    on conflict (user_id, item_key) do update set season_id = excluded.season_id, expires_at = excluded.expires_at;
  end if;
end;
$$;

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
    perform private.close_season(s.id);
    if not exists (select 1 from public.house_seasons where starts_at >= s.ends_at) then
      insert into public.house_seasons (name, starts_at, ends_at)
      values ('Season ' || (s.id + 1), s.ends_at, s.ends_at + interval '84 days');
    end if;
  end loop;
end;
$$;

revoke all on function public.join_ritual(), public.complete_ritual(), public.my_ritual(), public.house_top_contributors(text, int),
  public.house_duels(), public.my_week_games(), public.reader_marks(uuid) from public, anon;
grant execute on function public.join_ritual(), public.complete_ritual(), public.my_ritual(), public.house_top_contributors(text, int),
  public.house_duels(), public.my_week_games(), public.reader_marks(uuid) to authenticated;
