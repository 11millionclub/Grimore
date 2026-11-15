-- GriMore — 0007 Operations: cover enrichment and challenge publishing
--
-- * Covers for curated books come from Open Library's public search API,
--   fetched with pg_net a few at a time to respect its rate limits. A cover is
--   accepted only when Open Library's title matches ours exactly, so we never
--   attach a study guide or a single volume of a multi-part edition.
-- * A daily pg_cron job keeps 14 days of challenges scheduled ahead, drawing
--   only from validated pools (see private.schedule_challenges).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists private.cover_lookups (
  book_id uuid primary key references public.books (id) on delete cascade,
  request_id bigint not null,
  attempts int not null default 1,
  created_at timestamptz not null default now()
);
alter table private.cover_lookups add column if not exists attempts int not null default 1;

create table if not exists private.cover_results (
  book_id uuid primary key references public.books (id) on delete cascade,
  ol_key text,
  cover_i bigint,
  ol_title text,
  ol_year int,
  ol_pages int,
  checked_at timestamptz default now()
);

create or replace function private.request_cover_lookup(p_book uuid)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_get(
    url := 'https://openlibrary.org/search.json',
    params := jsonb_build_object('title', b.title, 'author', a.name, 'limit', '10',
      'fields', 'key,title,author_name,cover_i,first_publish_year,number_of_pages_median'),
    headers := '{"User-Agent": "GriMore/1.0 (catalogue enrichment)"}'::jsonb,
    timeout_milliseconds := 30000)
  from public.books b
  join public.book_authors ba on ba.book_id = b.id and ba.position = 0
  join public.authors a on a.id = ba.author_id
  where b.id = p_book
$$;

create or replace function private.enrich_covers_tick()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining int;
  r record;
begin
  -- 1. Harvest finished responses whose title matches exactly.
  insert into private.cover_results (book_id, ol_key, cover_i, ol_title, ol_year, ol_pages)
  select distinct on (l.book_id) l.book_id, d ->> 'key', (d ->> 'cover_i')::bigint, d ->> 'title',
    (d ->> 'first_publish_year')::int, (d ->> 'number_of_pages_median')::int
  from private.cover_lookups l
  join net._http_response resp on resp.id = l.request_id and resp.status_code = 200
  join public.books b on b.id = l.book_id
  cross join lateral jsonb_array_elements((resp.content::jsonb) -> 'docs') with ordinality as x(d, n)
  where d ? 'cover_i'
    and trim(regexp_replace(lower(d ->> 'title'), '[^[:alnum:]]+', ' ', 'g')) = trim(b.normalized_title)
  order by l.book_id, n
  on conflict (book_id) do update set ol_key = excluded.ol_key, cover_i = excluded.cover_i,
    ol_title = excluded.ol_title, ol_year = excluded.ol_year, ol_pages = excluded.ol_pages, checked_at = now();

  -- 2. Apply covers. Page estimates move to Open Library's median only when
  --    within 30% of the curated value (guards against abridged or multi-volume data).
  update public.books b set
    cover_url = 'https://covers.openlibrary.org/b/id/' || c.cover_i || '-L.jpg',
    cover_source = 'open_library',
    open_library_work_key = coalesce(b.open_library_work_key, replace(c.ol_key, '/works/', '')),
    page_count_estimate = case
      when c.ol_pages is not null and abs(c.ol_pages - b.page_count_estimate)::numeric / b.page_count_estimate <= 0.30
        then c.ol_pages else b.page_count_estimate end
  from private.cover_results c
  where c.book_id = b.id and b.cover_url is null and c.cover_i is not null
    and not exists (select 1 from public.books o where o.open_library_work_key = replace(c.ol_key, '/works/', '') and o.id <> b.id);

  -- 3. Queue new lookups (max 4 per tick, max 6 attempts per book).
  for r in
    select b.id, l.request_id
    from public.books b
    left join private.cover_lookups l on l.book_id = b.id
    left join net._http_response resp on resp.id = l.request_id
    where b.is_curated and b.cover_url is null
      and (l.book_id is null or (coalesce(l.attempts, 0) < 6 and l.created_at < now() - interval '45 seconds'
           and (resp.id is null or resp.status_code <> 200 or not exists (select 1 from private.cover_results c where c.book_id = b.id))))
    order by l.attempts nulls first, b.title
    limit 4
  loop
    insert into private.cover_lookups as cl (book_id, request_id)
    values (r.id, private.request_cover_lookup(r.id))
    on conflict (book_id) do update set request_id = excluded.request_id, attempts = cl.attempts + 1, created_at = now();
  end loop;

  select count(*) into v_remaining
  from public.books b left join private.cover_lookups l on l.book_id = b.id
  where b.is_curated and b.cover_url is null and coalesce(l.attempts, 0) < 6;

  if v_remaining = 0 then
    perform cron.unschedule('grimore-enrich-covers');
  end if;
  return v_remaining;
end;
$$;
revoke all on function private.enrich_covers_tick() from public, anon, authenticated;
revoke all on function private.request_cover_lookup(uuid) from public, anon, authenticated;

select cron.schedule('grimore-enrich-covers', '* * * * *', $$select private.enrich_covers_tick()$$);

-- Keep two weeks of challenges published ahead. Runs shortly after midnight UTC.
select cron.schedule('grimore-schedule-challenges', '5 0 * * *', $$select private.schedule_challenges(public.utc_today(), 14)$$);
select private.schedule_challenges(public.utc_today(), 14);
