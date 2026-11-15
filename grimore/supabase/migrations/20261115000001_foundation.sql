-- GriMore — 0001 Foundation
-- Extensions, shared helpers, profiles and user-level tables.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- Internal schema: never exposed through the Data API. Holds trusted helpers.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Canonical challenge day. Challenges are identified by UTC date so every
-- player in the world shares the same puzzle.
create or replace function public.utc_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'utc')::date $$;

-- Simple per-user rate limiting for user-generated content.
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
  execute format('select ($1).%I', v_owner_col) into v_owner using new;
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

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique
    check (username ~ '^[A-Za-z0-9_.]{3,24}$'),
  display_name text check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 280),
  avatar_url text check (char_length(avatar_url) <= 1024),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  is_private boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create index profiles_username_trgm on public.profiles
  using gin ((username::text) extensions.gin_trgm_ops);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reading_language text not null default 'en'
    check (reading_language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  app_language text not null default 'en'
    check (app_language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  show_spoilers boolean not null default false,
  -- My Corner personalisation. Validated shape, see check below.
  corner_layout text not null default 'editorial'
    check (corner_layout in ('editorial', 'shelf', 'gallery')),
  corner_theme text not null default 'ivory'
    check (corner_theme in ('ivory', 'linen', 'library', 'night', 'olive')),
  corner_featured_book_id uuid,
  corner_book_arrangement text not null default 'spine'
    check (corner_book_arrangement in ('spine', 'cover', 'stack')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function private.set_updated_at();

-- Maintained exclusively by trusted triggers. Clients only read.
create table public.user_statistics (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  books_read int not null default 0,
  books_reading int not null default 0,
  books_total int not null default 0,
  pages_read int not null default 0,
  reviews_count int not null default 0,
  posts_count int not null default 0,
  followers_count int not null default 0,
  following_count int not null default 0,
  total_xp int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Genres
-- ---------------------------------------------------------------------------
create table public.genres (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  sort_order smallint not null default 0
);

create table public.user_favorite_genres (
  user_id uuid not null references public.profiles (id) on delete cascade,
  genre_id smallint not null references public.genres (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, genre_id)
);
create index user_favorite_genres_genre_idx on public.user_favorite_genres (genre_id);

-- ---------------------------------------------------------------------------
-- New-user bootstrap
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_username text;
  v_display text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  if v_requested ~ '^[a-z0-9_.]{3,24}$'
     and not exists (select 1 from public.profiles where username = v_requested::extensions.citext) then
    v_username := v_requested;
  else
    v_username := 'reader_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, left(v_display, 60));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.user_statistics (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[A-Za-z0-9_.]{3,24}$'
     and not exists (
       select 1 from public.profiles where username = p_username::extensions.citext
     )
$$;
