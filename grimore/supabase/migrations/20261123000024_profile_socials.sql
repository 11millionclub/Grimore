-- Social handles shown on a reader's profile: {"instagram": "name", ...}.
-- Only known networks, handles only (no URLs), at most 40 characters each.
create or replace function private.valid_socials(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object' and coalesce((
    select bool_and(
      key in ('instagram', 'tiktok', 'x', 'threads', 'bluesky', 'youtube', 'goodreads', 'storygraph')
      and jsonb_typeof(value) = 'string'
      and (value #>> '{}') ~ '^[A-Za-z0-9._-]{1,40}$')
    from jsonb_each(p)), true);
$$;
alter table public.profiles add column if not exists socials jsonb not null default '{}'::jsonb;
alter table public.profiles add constraint profiles_socials_check check (private.valid_socials(socials));
grant select (socials) on public.profiles to authenticated;
grant update (socials) on public.profiles to authenticated;
