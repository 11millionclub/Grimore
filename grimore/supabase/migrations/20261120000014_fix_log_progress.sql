-- GriMore — 0014 log_progress: reading_sessions.pages_read is generated.
-- (0011 already contains the corrected body for fresh databases.)

create or replace function public.log_progress(
  p_book uuid, p_page int, p_note text default null,
  p_share boolean default false, p_audience text default 'public'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_ub public.user_books;
  v_total int;
  v_prev int;
  v_post uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_page is null or p_page < 0 or p_page > 50000 then raise exception 'invalid_page' using errcode = '22023'; end if;
  if p_audience not in ('public', 'followers') then raise exception 'invalid_audience' using errcode = '22023'; end if;
  if p_note is not null and char_length(p_note) > 2000 then raise exception 'note_too_long' using errcode = '22023'; end if;

  select * into v_ub from public.user_books where user_id = v_me and book_id = p_book for update;
  if not found then
    insert into public.user_books (user_id, book_id, status) values (v_me, p_book, 'reading')
    returning * into v_ub;
  end if;

  select coalesce(e.page_count, b.page_count_estimate) into v_total
  from public.books b left join public.book_editions e on e.id = v_ub.edition_id
  where b.id = p_book;
  if v_total is not null and v_total > 0 and p_page > v_total then p_page := v_total; end if;

  v_prev := coalesce(v_ub.current_page, 0);
  update public.user_books
  set current_page = p_page,
      progress_percent = case when v_total > 0 then least(100, round(p_page * 100.0 / v_total))::int2 else progress_percent end,
      status = case when status in ('want_to_read', 'on_hold', 'dnf') then 'reading' else status end
  where id = v_ub.id;

  if p_page > v_prev then
    insert into public.reading_sessions (user_id, user_book_id, started_at, ended_at, start_page, end_page, note)
    values (v_me, v_ub.id, now(), now(), v_prev, p_page, nullif(trim(p_note), ''));
  end if;

  if p_share then
    insert into public.posts (user_id, kind, book_id, page, body, audience)
    values (v_me, 'progress', p_book, p_page, nullif(trim(p_note), ''), p_audience)
    returning id into v_post;
  end if;

  return jsonb_build_object(
    'user_book_id', v_ub.id, 'page', p_page, 'total', v_total,
    'pages_logged', greatest(p_page - v_prev, 0), 'post_id', v_post
  );
end;
$$;
