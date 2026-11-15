-- GriMore — 0002 Book catalogue and personal library
--
-- A *book* is the literary work. An *edition* is one published manifestation
-- of it (publisher, format, ISBN, cover). Identifiers attach to editions, so
-- several ISBNs never duplicate the underlying work.

create type public.reading_status as enum ('want_to_read', 'reading', 'read', 'on_hold', 'dnf');
create type public.identifier_type as enum (
  'isbn_10', 'isbn_13', 'open_library_edition', 'open_library_work', 'google_volume', 'oclc'
);

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  sort_name text,
  -- ISO 3166-1 alpha-2 country the author is most commonly associated with.
  nationality_code text check (nationality_code ~ '^[A-Z]{2}$'),
  birth_year smallint,
  death_year smallint,
  bio text,
  open_library_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger authors_updated_at before update on public.authors
  for each row execute function private.set_updated_at();
create index authors_name_trgm on public.authors using gin (name extensions.gin_trgm_ops);
create unique index authors_name_unique on public.authors (lower(name)) where open_library_key is null;

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 500),
  subtitle text check (char_length(subtitle) <= 500),
  normalized_title text generated always as (
    lower(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g'))
  ) stored,
  description text,
  original_language text,
  first_published_year smallint check (first_published_year between -3000 and 2100),
  -- Approximate length of a typical edition; used for gentle game clues only.
  page_count_estimate int check (page_count_estimate between 1 and 20000),
  primary_genre_id smallint references public.genres (id) on delete set null,
  cover_url text check (char_length(cover_url) <= 1024),
  cover_source text check (cover_source in ('open_library', 'google_books', 'user')),
  open_library_work_key text unique,
  is_curated boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger books_updated_at before update on public.books
  for each row execute function private.set_updated_at();
create index books_title_trgm on public.books using gin (normalized_title extensions.gin_trgm_ops);
create index books_primary_genre_idx on public.books (primary_genre_id);
create index books_created_by_idx on public.books (created_by);

create table public.book_authors (
  book_id uuid not null references public.books (id) on delete cascade,
  author_id uuid not null references public.authors (id) on delete restrict,
  position smallint not null default 0,
  role text not null default 'author' check (role in ('author', 'translator', 'editor', 'illustrator')),
  primary key (book_id, author_id, role)
);
create index book_authors_author_idx on public.book_authors (author_id);

create table public.book_genres (
  book_id uuid not null references public.books (id) on delete cascade,
  genre_id smallint not null references public.genres (id) on delete cascade,
  primary key (book_id, genre_id)
);
create index book_genres_genre_idx on public.book_genres (genre_id);

create table public.book_editions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  title text,
  publisher text,
  published_date text,
  language text,
  page_count int check (page_count between 1 and 20000),
  format text check (format in ('hardcover', 'paperback', 'ebook', 'audiobook', 'other')),
  cover_url text check (char_length(cover_url) <= 1024),
  created_at timestamptz not null default now()
);
create index book_editions_book_idx on public.book_editions (book_id);

create table public.book_identifiers (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  edition_id uuid references public.book_editions (id) on delete cascade,
  type public.identifier_type not null,
  value text not null check (char_length(value) between 1 and 64),
  created_at timestamptz not null default now(),
  unique (type, value)
);
create index book_identifiers_book_idx on public.book_identifiers (book_id);
create index book_identifiers_edition_idx on public.book_identifiers (edition_id);

-- ---------------------------------------------------------------------------
-- Personal library
-- ---------------------------------------------------------------------------
create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  edition_id uuid references public.book_editions (id) on delete set null,
  status public.reading_status not null default 'want_to_read',
  rating numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  current_page int check (current_page >= 0),
  progress_percent smallint check (progress_percent between 0 and 100),
  started_on date,
  finished_on date,
  notes text check (char_length(notes) <= 10000),
  is_private boolean not null default false,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id),
  check (finished_on is null or started_on is null or finished_on >= started_on)
);
create trigger user_books_updated_at before update on public.user_books
  for each row execute function private.set_updated_at();
create index user_books_user_status_idx on public.user_books (user_id, status, updated_at desc);
create index user_books_book_idx on public.user_books (book_id);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_book_id uuid not null references public.user_books (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_page int check (start_page >= 0),
  end_page int check (end_page >= 0),
  pages_read int generated always as (
    case when end_page is not null and start_page is not null and end_page >= start_page
      then end_page - start_page end
  ) stored,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index reading_sessions_user_idx on public.reading_sessions (user_id, started_at desc);
create index reading_sessions_user_book_idx on public.reading_sessions (user_book_id);

create table public.reading_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  target_books smallint not null check (target_books between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);
create trigger reading_goals_updated_at before update on public.reading_goals
  for each row execute function private.set_updated_at();

create table public.reading_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 500),
  is_public boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reading_lists_updated_at before update on public.reading_lists
  for each row execute function private.set_updated_at();
create index reading_lists_user_idx on public.reading_lists (user_id, position);

create table public.reading_list_books (
  list_id uuid not null references public.reading_lists (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  position int not null default 0,
  note text check (char_length(note) <= 500),
  added_at timestamptz not null default now(),
  primary key (list_id, book_id)
);
create index reading_list_books_book_idx on public.reading_list_books (book_id);

create table public.user_favorite_books (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 11),
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index user_favorite_books_book_idx on public.user_favorite_books (book_id);

create table public.user_favorite_authors (
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.authors (id) on delete cascade,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);
create index user_favorite_authors_author_idx on public.user_favorite_authors (author_id);

-- Literary quotes shown in My Corner.
create table public.user_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  attribution text check (char_length(attribution) <= 160),
  book_id uuid references public.books (id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index user_quotes_user_idx on public.user_quotes (user_id, position);
create index user_quotes_book_idx on public.user_quotes (book_id);

alter table public.user_preferences
  add constraint user_preferences_featured_book_fk
  foreign key (corner_featured_book_id) references public.books (id) on delete set null;
create index user_preferences_featured_book_idx on public.user_preferences (corner_featured_book_id);

-- ---------------------------------------------------------------------------
-- Library statistics (trusted trigger)
-- ---------------------------------------------------------------------------
create or replace function private.refresh_library_stats(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_statistics s set
    books_total = agg.total,
    books_read = agg.read,
    books_reading = agg.reading,
    pages_read = agg.pages,
    updated_at = now()
  from (
    select
      count(*)::int as total,
      count(*) filter (where ub.status = 'read')::int as read,
      count(*) filter (where ub.status = 'reading')::int as reading,
      coalesce(sum(coalesce(e.page_count, b.page_count_estimate)) filter (where ub.status = 'read'), 0)::int as pages
    from public.user_books ub
    join public.books b on b.id = ub.book_id
    left join public.book_editions e on e.id = ub.edition_id
    where ub.user_id = p_user
  ) agg
  where s.user_id = p_user
$$;

create or replace function private.on_user_books_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_library_stats(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

create trigger user_books_stats
  after insert or update of status, edition_id or delete on public.user_books
  for each row execute function private.on_user_books_change();

-- Keep dates coherent with status changes.
create or replace function private.user_books_status_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'reading' and new.started_on is null then
    new.started_on := public.utc_today();
  end if;
  if new.status = 'read' then
    if new.finished_on is null then new.finished_on := public.utc_today(); end if;
    new.progress_percent := 100;
  end if;
  return new;
end;
$$;

create trigger user_books_dates
  before insert or update of status on public.user_books
  for each row execute function private.user_books_status_dates();

-- ---------------------------------------------------------------------------
-- Catalogue writes go through this trusted function so that clients cannot
-- create duplicates or overwrite curated data.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_book(p_book jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_book_id uuid;
  v_edition_id uuid;
  v_title text := nullif(trim(p_book ->> 'title'), '');
  v_authors jsonb := coalesce(p_book -> 'authors', '[]'::jsonb);
  v_first_author text := nullif(trim(v_authors ->> 0), '');
  v_ids jsonb := coalesce(p_book -> 'identifiers', '[]'::jsonb);
  v_work_key text := nullif(p_book ->> 'open_library_work_key', '');
  v_cover text := nullif(p_book ->> 'cover_url', '');
  v_cover_source text := nullif(p_book ->> 'cover_source', '');
  v_id jsonb;
  v_author_name text;
  v_author_id uuid;
  v_pos int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_title is null or char_length(v_title) > 500 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if jsonb_typeof(v_authors) <> 'array' or jsonb_array_length(v_authors) > 10 then
    raise exception 'invalid_authors' using errcode = '22023';
  end if;
  if jsonb_typeof(v_ids) <> 'array' or jsonb_array_length(v_ids) > 20 then
    raise exception 'invalid_identifiers' using errcode = '22023';
  end if;
  if v_cover is not null and v_cover !~ '^https://' then
    v_cover := null;
  end if;

  -- 1. Match by any known identifier (ISBN, Google volume, OL edition).
  select bi.book_id into v_book_id
  from jsonb_array_elements(v_ids) x
  join public.book_identifiers bi
    on bi.type = (x ->> 'type')::public.identifier_type and bi.value = upper(x ->> 'value')
  limit 1;

  -- 2. Match by Open Library work key.
  if v_book_id is null and v_work_key is not null then
    select id into v_book_id from public.books where open_library_work_key = v_work_key;
  end if;

  -- 3. Match by normalized title + first author (exact, conservative).
  if v_book_id is null and v_first_author is not null then
    select b.id into v_book_id
    from public.books b
    join public.book_authors ba on ba.book_id = b.id and ba.position = 0
    join public.authors a on a.id = ba.author_id
    where b.normalized_title = lower(regexp_replace(v_title, '[^[:alnum:]]+', ' ', 'g'))
      and lower(a.name) = lower(v_first_author)
    limit 1;
  end if;

  if v_book_id is null then
    insert into public.books (
      title, subtitle, description, first_published_year, page_count_estimate,
      cover_url, cover_source, open_library_work_key, original_language, created_by
    ) values (
      v_title,
      left(nullif(trim(p_book ->> 'subtitle'), ''), 500),
      left(nullif(p_book ->> 'description', ''), 8000),
      case when (p_book ->> 'first_published_year') ~ '^-?[0-9]{1,4}$'
        then (p_book ->> 'first_published_year')::smallint end,
      case when (p_book ->> 'page_count') ~ '^[0-9]{1,5}$' and (p_book ->> 'page_count')::int between 1 and 20000
        then (p_book ->> 'page_count')::int end,
      v_cover, case when v_cover is not null then coalesce(v_cover_source, 'user') end,
      v_work_key,
      left(nullif(p_book ->> 'language', ''), 8),
      v_uid
    )
    returning id into v_book_id;

    for v_author_name in select trim(value) from jsonb_array_elements_text(v_authors) loop
      continue when v_author_name = '' or char_length(v_author_name) > 200;
      select id into v_author_id from public.authors where lower(name) = lower(v_author_name) limit 1;
      if v_author_id is null then
        insert into public.authors (name) values (v_author_name) returning id into v_author_id;
      end if;
      insert into public.book_authors (book_id, author_id, position)
      values (v_book_id, v_author_id, v_pos) on conflict do nothing;
      v_pos := v_pos + 1;
    end loop;
  elsif v_cover is not null then
    update public.books set cover_url = v_cover, cover_source = coalesce(v_cover_source, 'user')
    where id = v_book_id and cover_url is null;
  end if;

  -- Record the edition the user is holding, when identifiers were supplied.
  if jsonb_array_length(v_ids) > 0 then
    select edition_id into v_edition_id
    from jsonb_array_elements(v_ids) x
    join public.book_identifiers bi
      on bi.type = (x ->> 'type')::public.identifier_type and bi.value = upper(x ->> 'value')
    where bi.edition_id is not null
    limit 1;

    if v_edition_id is null then
      insert into public.book_editions (book_id, title, publisher, published_date, language, page_count, cover_url)
      values (
        v_book_id, v_title,
        left(nullif(p_book ->> 'publisher', ''), 200),
        left(nullif(p_book ->> 'published_date', ''), 20),
        left(nullif(p_book ->> 'language', ''), 8),
        case when (p_book ->> 'page_count') ~ '^[0-9]{1,5}$' and (p_book ->> 'page_count')::int between 1 and 20000
          then (p_book ->> 'page_count')::int end,
        v_cover
      )
      returning id into v_edition_id;
    end if;

    for v_id in select * from jsonb_array_elements(v_ids) loop
      continue when (v_id ->> 'type') not in ('isbn_10', 'isbn_13', 'open_library_edition', 'google_volume', 'oclc');
      continue when coalesce(v_id ->> 'value', '') !~ '^[A-Za-z0-9_-]{1,64}$';
      insert into public.book_identifiers (book_id, edition_id, type, value)
      values (v_book_id, v_edition_id, (v_id ->> 'type')::public.identifier_type, upper(v_id ->> 'value'))
      on conflict (type, value) do nothing;
    end loop;
  end if;

  return v_book_id;
end;
$$;

-- Catalogue search: trigram similarity on title, plus author names.
create or replace function public.search_catalogue(p_query text, p_limit int default 20)
returns table (
  id uuid, title text, cover_url text, first_published_year smallint,
  authors text, score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select lower(regexp_replace(trim(p_query), '[^[:alnum:]]+', ' ', 'g')) as v
  )
  select b.id, b.title, b.cover_url, b.first_published_year,
    (select string_agg(a.name, ', ' order by ba.position)
       from public.book_authors ba join public.authors a on a.id = ba.author_id
      where ba.book_id = b.id and ba.role = 'author') as authors,
    greatest(
      extensions.similarity(b.normalized_title, q.v),
      coalesce((select max(extensions.similarity(lower(a.name), q.v))
         from public.book_authors ba join public.authors a on a.id = ba.author_id
        where ba.book_id = b.id), 0) * 0.8
    )::real as score
  from public.books b, q
  where char_length(q.v) >= 2
    and (
      b.normalized_title operator(extensions.%) q.v
      or b.normalized_title like '%' || q.v || '%'
      or exists (
        select 1 from public.book_authors ba join public.authors a on a.id = ba.author_id
        where ba.book_id = b.id and lower(a.name) like '%' || q.v || '%'
      )
    )
  order by score desc, b.is_curated desc, b.title
  limit least(greatest(p_limit, 1), 50)
$$;
