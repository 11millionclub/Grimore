-- GriMore — find books by mood, trope, spice, genre and length (not only in the wheel).
-- Moods come from the catalogue; tropes from readers' review tags (respecting
-- private profiles like book_tags); spice is the readers' average (1–5).
create or replace function public.discover_books(
  p_moods text[] default null,
  p_tropes text[] default null,
  p_spice_min numeric default null,
  p_spice_max numeric default null,
  p_genre int default null,
  p_min_pages int default null,
  p_max_pages int default null,
  p_limit int default 60
) returns jsonb
language sql stable security definer set search_path = '' as $$
  with tagged as (
    select r.book_id, t.tag, count(*) as n
    from public.reviews r
    join public.profiles p on p.id = r.user_id
    cross join unnest(r.tags) as t(tag)
    where not p.is_private or p.id = auth.uid()
       or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id and f.status = 'accepted')
    group by r.book_id, t.tag
  ),
  spice as (
    select ub.book_id, round(avg(ub.spice)::numeric, 1) as avg_spice, count(*) as votes
    from public.user_books ub where ub.spice is not null group by ub.book_id
  ),
  readers as (select ub.book_id, count(*) as n from public.user_books ub group by ub.book_id),
  hits as (
    select b.id, b.title, b.cover_url, b.page_count_estimate, b.first_published_year, b.moods, s.avg_spice, s.votes,
      coalesce((select array_agg(t.tag order by t.n desc) from tagged t where t.book_id = b.id), '{}') as tropes,
      coalesce(rd.n, 0) as readers
    from public.books b
    left join spice s on s.book_id = b.id
    left join readers rd on rd.book_id = b.id
    where (p_moods is null or cardinality(p_moods) = 0 or coalesce(b.moods, '{}') @> p_moods)
      and (p_tropes is null or cardinality(p_tropes) = 0
           or (select count(distinct t.tag) from tagged t where t.book_id = b.id and t.tag = any (p_tropes)) = cardinality(p_tropes))
      and (p_spice_min is null or s.avg_spice >= p_spice_min)
      and (p_spice_max is null or s.avg_spice <= p_spice_max)
      and (p_genre is null or b.primary_genre_id = p_genre or exists (select 1 from public.book_genres bg where bg.book_id = b.id and bg.genre_id = p_genre))
      and (p_min_pages is null or b.page_count_estimate >= p_min_pages)
      and (p_max_pages is null or b.page_count_estimate <= p_max_pages)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', h.id, 'title', h.title, 'cover_url', h.cover_url, 'pages', h.page_count_estimate, 'year', h.first_published_year,
      'moods', coalesce(h.moods, '{}'), 'tropes', h.tropes, 'spice', h.avg_spice, 'spice_votes', coalesce(h.votes, 0),
      'authors', (select string_agg(a.name, ', ' order by ba.position) from public.book_authors ba join public.authors a on a.id = ba.author_id where ba.book_id = h.id)
    ) order by h.readers desc, h.title), '[]'::jsonb)
  from (select * from hits order by readers desc, title limit greatest(1, least(coalesce(p_limit, 60), 100))) h
$$;
revoke all on function public.discover_books(text[], text[], numeric, numeric, int, int, int, int) from public, anon;
grant execute on function public.discover_books(text[], text[], numeric, numeric, int, int, int, int) to authenticated;

-- The moods used in the catalogue, most common first (for the filter chips).
create or replace function public.book_moods() returns table(mood text, n bigint)
language sql stable security definer set search_path = '' as $$
  select m, count(*) from public.books, unnest(moods) m group by m order by 2 desc, 1
$$;
revoke all on function public.book_moods() from public, anon;
grant execute on function public.book_moods() to authenticated;
