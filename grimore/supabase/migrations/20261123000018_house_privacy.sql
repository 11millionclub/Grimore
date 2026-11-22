-- A reader's House is only visible through reader_houses(), which hides it
-- when house_hidden is on (except to the reader themself). The raw columns
-- are no longer selectable by clients.
revoke select on public.profiles from authenticated, anon;
grant select (id, username, display_name, bio, avatar_url, country_code, is_private, onboarding_completed_at,
              created_at, updated_at, archetype, city, house_hidden) on public.profiles to authenticated;
grant update (house_hidden) on public.profiles to authenticated;

create or replace function public.reader_houses(p_ids uuid[])
returns table (user_id uuid, house_id text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.house_id
  from public.profiles p
  where p.id = any (p_ids[1:500])
    and p.house_id is not null
    and (not p.house_hidden or p.id = auth.uid())
    and not private.is_blocked_between(p.id, auth.uid());
$$;

-- The reader's own House, with when it was assigned (for the change rules).
create or replace function public.my_house()
returns table (house_id text, house_hidden boolean, house_assigned_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select house_id, house_hidden, house_assigned_at from public.profiles where id = auth.uid();
$$;

revoke all on function public.reader_houses(uuid[]), public.my_house() from public, anon;
grant execute on function public.reader_houses(uuid[]), public.my_house() to authenticated;
