-- GriMore — reading format per book (print, ebook, audiobook) and progress in %.
alter table public.user_books add column if not exists format text not null default 'print';
alter table public.user_books drop constraint if exists user_books_format_check;
alter table public.user_books add constraint user_books_format_check check (format in ('print', 'ebook', 'audio'));
grant insert (format), update (format) on public.user_books to authenticated;

-- Log progress as a percentage (ebooks and audiobooks). When the book's page
-- count is known the page is derived too, so stats and streaks stay coherent.
create or replace function public.log_progress_percent(p_book uuid, p_percent int, p_note text default null, p_share boolean default false, p_audience text default 'public')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_ub public.user_books;
  v_total int;
  v_prev_pct int;
  v_prev_page int;
  v_page int;
  v_post uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_percent is null or p_percent < 0 or p_percent > 100 then raise exception 'invalid_percent' using errcode = '22023'; end if;
  if p_audience not in ('public', 'followers') then raise exception 'invalid_audience' using errcode = '22023'; end if;
  if p_note is not null and char_length(p_note) > 2000 then raise exception 'note_too_long' using errcode = '22023'; end if;

  select * into v_ub from public.user_books where user_id = v_me and book_id = p_book for update;
  if not found then
    insert into public.user_books (user_id, book_id, status) values (v_me, p_book, 'reading') returning * into v_ub;
  end if;
  select coalesce(e.page_count, b.page_count_estimate) into v_total
  from public.books b left join public.book_editions e on e.id = v_ub.edition_id where b.id = p_book;

  v_prev_pct := coalesce(v_ub.progress_percent, 0);
  v_prev_page := coalesce(v_ub.current_page, 0);
  v_page := case when v_total > 0 then round(p_percent * v_total / 100.0)::int else v_ub.current_page end;

  update public.user_books
  set progress_percent = p_percent::int2,
      current_page = v_page,
      status = case when status in ('want_to_read', 'on_hold', 'dnf') then 'reading' else status end
  where id = v_ub.id;

  if p_percent > v_prev_pct then
    insert into public.reading_sessions (user_id, user_book_id, started_at, ended_at, start_page, end_page, note)
    values (v_me, v_ub.id, now(), now(), case when v_total > 0 then v_prev_page end, case when v_total > 0 then v_page end, nullif(trim(p_note), ''));
  end if;

  if p_share then
    insert into public.posts (user_id, kind, book_id, page, body, audience)
    values (v_me, 'progress', p_book, v_page, nullif(trim(p_note), ''), p_audience)
    returning id into v_post;
  end if;

  return jsonb_build_object('user_book_id', v_ub.id, 'percent', p_percent, 'page', v_page, 'total', v_total,
    'percent_logged', greatest(p_percent - v_prev_pct, 0), 'post_id', v_post);
end;
$$;
revoke all on function public.log_progress_percent(uuid, int, text, boolean, text) from public, anon;
grant execute on function public.log_progress_percent(uuid, int, text, boolean, text) to authenticated;
