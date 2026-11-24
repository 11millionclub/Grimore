-- The timer ("reading session") gets its own table: reading_sessions already
-- (Also removes a stray public.corners_guard() created by the first run of 31.)
drop function if exists public.corners_guard();
-- holds page logs and needs a library entry.
drop policy if exists "own sessions" on public.reading_sessions;

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  seconds int not null check (seconds between 1 and 43200),
  ended_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id, ended_at desc);
alter table public.focus_sessions enable row level security;
create policy "own focus sessions" on public.focus_sessions for select using (user_id = (select auth.uid()));

-- Save a finished session and add its minutes to the book in your library.
create or replace function public.log_reading_session(p_book uuid, p_seconds int)
returns table (minutes_today int, minutes_book int)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_secs int := least(greatest(coalesce(p_seconds, 0), 0), 43200);
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_secs < 1 then raise exception 'session_too_short' using errcode = '22023'; end if;
  insert into public.focus_sessions (user_id, book_id, seconds) values (v_user, p_book, v_secs);
  if p_book is not null then
    update public.user_books set minutes_read = least(minutes_read + round(v_secs / 60.0)::int, 100000)
    where user_id = v_user and book_id = p_book;
  end if;
  return query
    select (select coalesce(sum(seconds), 0) / 60 from public.focus_sessions where user_id = v_user and ended_at >= date_trunc('day', now()))::int,
           (select ub.minutes_read from public.user_books ub where ub.user_id = v_user and ub.book_id = p_book);
end;
$$;
revoke all on function public.log_reading_session(uuid, int) from public, anon;
grant execute on function public.log_reading_session(uuid, int) to authenticated;
