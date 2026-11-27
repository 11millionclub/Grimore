-- GriMore — the four Houses of the House Sorting specification.
--
-- Lantern, Quill, Thorn and Hourglass become Wanderers, Weavers, Luminaries
-- and Seekers. Every reader, point, season, item, common room and ritual
-- entry moves to the matching new House (nothing is deleted):
--   lantern (discovery) -> wanderers    thorn (feeling)     -> weavers
--   quill (meaning)     -> luminaries   hourglass (momentum)-> seekers
-- Readers sorted by the old quiz may take the new quiz once ("resort").
-- The server scores the new 12-question quiz itself with the approved vectors.

select set_config('grimore.house_rpc', 'on', true);

create temp table house_map (old text primary key, new text not null, old_name text not null, new_name text not null) on commit drop;
insert into house_map values
  ('lantern', 'wanderers', 'Lantern', 'Wanderers'),
  ('thorn', 'weavers', 'Thorn', 'Weavers'),
  ('quill', 'luminaries', 'Quill', 'Luminaries'),
  ('hourglass', 'seekers', 'Hourglass', 'Seekers');

-- ------------------------------------------------------------------- houses
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.houses'::regclass and contype = 'c' loop
    execute format('alter table public.houses drop constraint %I', c);
  end loop;
end $$;

insert into public.houses (id, name, sigil, rival_id, sort_order, color_token, i18n_prefix, member_name) values
  ('wanderers', 'Wanderers', 'compass', null, 1, 'house-wanderers', 'houses.wanderers', 'Wanderers'),
  ('weavers', 'Weavers', 'thread', null, 2, 'house-weavers', 'houses.weavers', 'Weavers'),
  ('luminaries', 'Luminaries', 'starburst', null, 3, 'house-luminaries', 'houses.luminaries', 'Luminaries'),
  ('seekers', 'Seekers', 'key', null, 4, 'house-seekers', 'houses.seekers', 'Seekers')
on conflict (id) do nothing;
update public.houses set rival_id = case id when 'wanderers' then 'weavers' when 'weavers' then 'wanderers' when 'luminaries' then 'seekers' when 'seekers' then 'luminaries' end
where id in ('wanderers', 'weavers', 'luminaries', 'seekers');

-- ---------------------------------------------------------- data that points at a House
update public.profiles p set house_id = m.new from house_map m where p.house_id = m.old;
update public.house_points x set house_id = m.new from house_map m where x.house_id = m.old;
update public.house_seasons x set winner_house_id = m.new from house_map m where x.winner_house_id = m.old;
update public.sorting_results x set house_id = m.new from house_map m where x.house_id = m.old;
update public.house_changes x set from_house = m.new from house_map m where x.from_house = m.old;
update public.house_changes x set to_house = m.new from house_map m where x.to_house = m.old;
update public.house_ritual_entries x set house_id = m.new from house_map m where x.house_id = m.old;
update public.communities x set house_id = m.new, name = m.new_name || ' Common Room', slug = 'house-' || m.new from house_map m where x.house_id = m.old;
update public.sorting_results x set scores = (
  select jsonb_object_agg(coalesce(m.new, s.key), s.value) from jsonb_each(x.scores) s left join house_map m on m.old = s.key
) where x.scores ?| array['lantern', 'quill', 'thorn', 'hourglass'];

-- House items: same items under the new House keys and names.
insert into public.corner_items (key, kind, name, price_cents, sort_order, house_id, source)
select replace(ci.key, 'house-' || m.old, 'house-' || m.new), ci.kind, replace(ci.name, m.old_name, m.new_name), ci.price_cents, ci.sort_order, m.new, ci.source
from public.corner_items ci join house_map m on ci.house_id = m.old
on conflict (key) do nothing;
update public.corner_items set name = v.name from (values
  ('theme:house-wanderers-premium-a', 'Wanderers: Midnight Map'), ('theme:house-wanderers-premium-b', 'Wanderers: Far Horizon'),
  ('theme:house-weavers-premium-a', 'Weavers: Woven Hearth'), ('theme:house-weavers-premium-b', 'Weavers: Red Thread'),
  ('theme:house-luminaries-premium-a', 'Luminaries: Marginalia'), ('theme:house-luminaries-premium-b', 'Luminaries: First Light'),
  ('theme:house-seekers-premium-a', 'Seekers: Cipher'), ('theme:house-seekers-premium-b', 'Seekers: Keyhole')
) v(key, name) where corner_items.key = v.key;

update public.user_items x set item_key = replace(x.item_key, 'house-' || m.old, 'house-' || m.new) from house_map m where x.item_key like '%house-' || m.old || '%';
update public.corner_purchases x set item_key = replace(x.item_key, 'house-' || m.old, 'house-' || m.new) from house_map m where x.item_key like '%house-' || m.old || '%';
insert into public.point_rewards (id, kind, title, description, cost_points, item_key, discount_percent, active, sort_order)
select replace(r.id, 'house-' || m.old, 'house-' || m.new), r.kind, replace(r.title, m.old_name, m.new_name), r.description, r.cost_points,
       replace(r.item_key, 'house-' || m.old, 'house-' || m.new), r.discount_percent, r.active, r.sort_order
from public.point_rewards r join house_map m on r.item_key like '%house-' || m.old || '%'
on conflict (id) do nothing;
update public.point_rewards r set title = ci.name
from public.corner_items ci where r.item_key = ci.key and ci.key like 'theme:house-%-premium-%';
delete from public.point_rewards r using house_map m where r.item_key like '%house-' || m.old || '%';
update public.corners c set
  theme = replace(c.theme, 'house-' || m.old, 'house-' || m.new),
  frame = replace(c.frame, 'house-' || m.old, 'house-' || m.new),
  name_style = replace(c.name_style, 'house-' || m.old, 'house-' || m.new),
  pack = replace(c.pack, 'house-' || m.old, 'house-' || m.new)
from house_map m
where c.theme like 'house-' || m.old || '%' or c.frame like 'house-' || m.old || '%' or c.name_style like 'house-' || m.old || '%' or c.pack like 'house-' || m.old || '%';
delete from public.corner_items ci using house_map m where ci.house_id = m.old;

-- Ritual badges for the new rituals (nobody had earned the old ones).
insert into public.corner_items (key, kind, name, price_cents, sort_order, house_id, source) values
  ('badge:ritual-return', 'badge', 'The Return', null, 231, null, 'earned'),
  ('badge:ritual-question', 'badge', 'The Weekly Question', null, 232, null, 'earned'),
  ('badge:ritual-cipher', 'badge', 'The Cipher Circle', null, 233, null, 'earned')
on conflict (key) do nothing;
delete from public.corner_items where key in ('badge:ritual-debate', 'badge:ritual-heartbreak', 'badge:ritual-marathon')
  and not exists (select 1 from public.user_items u where u.item_key = corner_items.key);

-- Old Houses go once nothing points at them.
update public.houses set rival_id = null where id in ('lantern', 'quill', 'thorn', 'hourglass');
delete from public.houses where id in ('lantern', 'quill', 'thorn', 'hourglass');
alter table public.houses add constraint houses_id_check check (id in ('wanderers', 'weavers', 'luminaries', 'seekers'));

-- ------------------------------------------------------------------ sorting
alter table public.sorting_results add column if not exists quiz_version int not null default 1;
alter table public.sorting_results add column if not exists tie_break_answer text;
alter table public.sorting_results add column if not exists multi_tie boolean not null default false;
alter table public.house_changes drop constraint if exists house_changes_reason_check;
alter table public.house_changes add constraint house_changes_reason_check check (reason in ('initial', 'reveal', 'season_window', 'resort'));

-- The approved score vectors [Wanderers, Weavers, Luminaries, Seekers], generated from src/utils/sorting-quiz.ts.
create or replace function private.sorting_vectors() returns jsonb
language sql immutable set search_path = '' as $$
  select '{"q1":{"a":[0,0,10,20],"b":[0,0,20,5],"c":[5,20,0,0],"d":[20,0,5,5]},"q2":{"a":[0,20,0,0],"b":[5,0,5,20],"c":[15,5,0,0],"d":[0,0,20,5]},"q3":{"a":[5,0,20,5],"b":[0,5,5,15],"c":[20,0,0,5],"d":[0,20,0,0]},"q4":{"a":[0,0,20,5],"b":[5,20,0,0],"c":[0,0,10,20],"d":[20,0,5,5]},"q5":{"a":[20,5,0,0],"b":[0,0,5,20],"c":[0,20,0,0],"d":[0,0,20,5]},"q6":{"a":[0,20,0,0],"b":[0,0,20,10],"c":[10,0,10,20],"d":[10,10,5,5]},"q7":{"a":[0,0,10,20],"b":[5,15,10,0],"c":[20,0,5,5],"d":[0,0,20,5]},"q8":{"a":[20,0,0,5],"b":[0,0,20,0],"c":[0,0,5,20],"d":[0,15,5,0]},"q9":{"a":[0,20,0,5],"b":[20,5,0,0],"c":[0,0,20,5],"d":[0,0,10,20]},"q10":{"a":[0,0,20,5],"b":[20,0,0,5],"c":[0,20,0,5],"d":[0,0,5,20]},"q11":{"a":[15,10,0,0],"b":[0,20,0,5],"c":[0,0,20,10],"d":[0,0,5,20]},"q12":{"a":[20,0,5,0],"b":[0,0,20,5],"c":[0,0,5,20],"d":[0,20,0,0]}}'::jsonb
$$;

-- The six pair tie-breakers: pair (in House order) -> answer -> House that gets +20.
create or replace function private.sorting_tie_breakers() returns jsonb
language sql immutable set search_path = '' as $$
  select '{"wanderers|weavers":{"a":"weavers","b":"wanderers"},"wanderers|luminaries":{"a":"wanderers","b":"luminaries"},"wanderers|seekers":{"a":"wanderers","b":"seekers"},"weavers|luminaries":{"a":"weavers","b":"luminaries"},"weavers|seekers":{"a":"weavers","b":"seekers"},"luminaries|seekers":{"a":"luminaries","b":"seekers"}}'::jsonb
$$;
revoke all on function private.sorting_vectors(), private.sorting_tie_breakers() from public, anon, authenticated;

drop function if exists public.submit_sorting(jsonb, text, text);
create function public.submit_sorting(p_answers jsonb, p_tie_break text default null, p_choice text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_vec jsonb := private.sorting_vectors();
  v_order text[] := array['wanderers', 'weavers', 'luminaries', 'seekers'];
  v_scores int[] := array[0, 0, 0, 0];
  v_top int;
  v_tied text[];
  v_house text;
  v_key text;
  v_opt jsonb;
  v_had text;
  v_pair text;
  v_reason text;
  i int;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select house_id into v_had from public.profiles where id = v_user;
  -- A House is set once; readers sorted by the earlier quiz may take this one once.
  if v_had is not null and (
       exists (select 1 from public.sorting_results where user_id = v_user and quiz_version >= 2)
       or not exists (select 1 from public.sorting_results where user_id = v_user)) then
    raise exception 'house_already_set' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profile_private where user_id = v_user) then
    raise exception 'birth_date_required' using errcode = 'P0001';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or (select count(*) from jsonb_object_keys(p_answers)) <> 12 then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_answers) loop
    v_opt := v_vec -> v_key -> (p_answers ->> v_key);
    if v_opt is null then raise exception 'invalid_answers' using errcode = '22023'; end if;
    for i in 1..4 loop v_scores[i] := v_scores[i] + (v_opt ->> (i - 1))::int; end loop;
  end loop;

  select max(s) into v_top from unnest(v_scores) s;
  select array_agg(v_order[k] order by k) into v_tied from generate_subscripts(v_scores, 1) as g(k) where v_scores[k] = v_top;

  if array_length(v_tied, 1) = 1 then
    v_house := v_tied[1];
  elsif array_length(v_tied, 1) = 2 then
    v_pair := v_tied[1] || '|' || v_tied[2];
    v_house := private.sorting_tie_breakers() -> v_pair ->> p_tie_break;
    if v_house is null then raise exception 'tie_break_required' using errcode = 'P0001'; end if;
    i := array_position(v_order, v_house);
    v_scores[i] := v_scores[i] + 20;
  else
    -- Three or four Houses tied: no automatic winner; the reader chooses among them.
    if p_choice is null or not (p_choice = any (v_tied)) then raise exception 'choice_required' using errcode = 'P0001'; end if;
    v_house := p_choice;
  end if;

  v_reason := case when v_had is null then 'initial' else 'resort' end;
  insert into public.sorting_results (user_id, answers, scores, house_id, tie_break_used, chosen_from_top_two, skipped, quiz_version, tie_break_answer, multi_tie)
  values (v_user, p_answers, jsonb_build_object('wanderers', v_scores[1], 'weavers', v_scores[2], 'luminaries', v_scores[3], 'seekers', v_scores[4]),
          v_house, v_pair is not null, false, false, 2, case when v_pair is not null then p_tie_break end, array_length(v_tied, 1) > 2);
  if v_had is distinct from v_house then
    perform private.assign_house(v_user, v_house, v_reason, private.current_season());
  end if;
  return jsonb_build_object('house', v_house,
    'scores', jsonb_build_object('wanderers', v_scores[1], 'weavers', v_scores[2], 'luminaries', v_scores[3], 'seekers', v_scores[4]),
    'tie_break', v_pair is not null, 'multi', array_length(v_tied, 1) > 2);
end;
$$;
revoke all on function public.submit_sorting(jsonb, text, text) from public, anon;
grant execute on function public.submit_sorting(jsonb, text, text) to authenticated;

-- Whether this reader can take the new quiz (no House yet, or sorted by the old one).
create or replace function public.can_take_sorting() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select house_id from public.profiles where id = auth.uid()) is null
      or (exists (select 1 from public.sorting_results where user_id = auth.uid())
          and not exists (select 1 from public.sorting_results where user_id = auth.uid() and quiz_version >= 2))
$$;
revoke all on function public.can_take_sorting() from public, anon;
grant execute on function public.can_take_sorting() to authenticated;

-- The result is the result: Houses change only in the week after a season ends.
create or replace function public.change_house(p_house text)
returns text language plpgsql security definer set search_path = '' as $$
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
  select id into v_window from public.house_seasons where now() >= ends_at and now() < ends_at + interval '7 days' order by ends_at desc limit 1;
  if v_window is null then raise exception 'house_change_locked' using errcode = 'P0001', hint = 'You can change House in the week after a season ends.'; end if;
  if exists (select 1 from public.house_changes where user_id = v_user and season_id = v_window and reason = 'season_window') then
    raise exception 'house_change_used' using errcode = 'P0001';
  end if;
  perform private.assign_house(v_user, p_house, 'season_window', v_window);
  return p_house;
end;
$$;

-- ------------------------------------------------------------- duels, rituals
create or replace function private.award_duels(p_week_start date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_season int;
  v_pair text[];
  a numeric; b numeric;
begin
  select id into v_season from public.house_seasons where p_week_start::timestamptz >= starts_at and p_week_start::timestamptz < ends_at limit 1;
  if v_season is null then return; end if;
  foreach v_pair slice 1 in array array[array['wanderers','weavers'], array['luminaries','seekers']] loop
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

-- Luminaries' ritual is weekly (The Weekly Question); the others are monthly.
create or replace function private.ritual_period(p_house text) returns text
language sql stable set search_path = '' as $$
  select case when p_house = 'luminaries' then to_char(public.utc_today(), 'IYYY-"W"IW') else to_char(public.utc_today(), 'YYYY-MM') end;
$$;

create or replace function public.complete_ritual() returns void
language plpgsql security definer set search_path = '' as $$
declare v_house text := (select house_id from public.profiles where id = auth.uid());
begin
  update public.house_ritual_entries set status = 'completed', completed_at = now()
   where user_id = auth.uid() and period = private.ritual_period(v_house) and status = 'joined';
  if not found then raise exception 'ritual_not_joined' using errcode = 'P0001'; end if;
  insert into public.user_items (user_id, item_key, source, season_id)
  values (auth.uid(), 'badge:ritual-' || case v_house when 'wanderers' then 'uncharted' when 'weavers' then 'return' when 'luminaries' then 'question' else 'cipher' end, 'earned', private.current_season())
  on conflict do nothing;
end;
$$;
