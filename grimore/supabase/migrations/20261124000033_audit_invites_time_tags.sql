-- GriMore — audit fixes: invite points only for active invitees, a daily
-- ceiling on reading time, and review tags that respect private profiles.

-- ---------------------------------------------------------------- Invites
-- The new reader still gets their 50 points at once. The inviter's 100 now
-- wait until the new reader is active: three days of daily games, or a book
-- with logged pages, or a finished book. Fake accounts no longer pay out.
alter table public.invite_redemptions add column if not exists rewarded_at timestamptz;

create or replace function private.reward_inviter(p_invitee uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.invite_redemptions;
begin
  select * into r from public.invite_redemptions where invitee_id = p_invitee and rewarded_at is null for update;
  if not found then return; end if;
  if (select count(distinct a.challenge_date) from public.game_attempts a where a.user_id = p_invitee and a.completed_at is not null) >= 3
     or exists (select 1 from public.reading_sessions s where s.user_id = p_invitee)
     or exists (select 1 from public.user_books b where b.user_id = p_invitee and b.status = 'read')
  then
    -- An inviter is rewarded for at most 50 readers.
    if (select count(*) from public.invite_redemptions x where x.inviter_id = r.inviter_id and x.rewarded_at is not null) < 50 then
      insert into public.point_grants (user_id, reason, points, source_id)
      values (r.inviter_id, 'invite_sent', 100, p_invitee::text)
      on conflict (user_id, reason, source_id) do nothing;
    end if;
    update public.invite_redemptions set rewarded_at = now() where invitee_id = p_invitee;
  end if;
end;
$$;

create or replace function private.trg_reward_inviter() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.invite_redemptions where invitee_id = new.user_id and rewarded_at is null) then
    perform private.reward_inviter(new.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists reward_inviter_games on public.game_attempts;
create trigger reward_inviter_games after insert or update of completed_at on public.game_attempts
  for each row when (new.completed_at is not null) execute function private.trg_reward_inviter();
drop trigger if exists reward_inviter_pages on public.reading_sessions;
create trigger reward_inviter_pages after insert on public.reading_sessions
  for each row execute function private.trg_reward_inviter();
drop trigger if exists reward_inviter_finished on public.user_books;
create trigger reward_inviter_finished after insert or update of status on public.user_books
  for each row when (new.status = 'read') execute function private.trg_reward_inviter();

create or replace function public.redeem_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_inviter uuid;
  v_joined timestamptz;
  v_joined_pts int := 50;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select user_id into v_inviter from public.invite_codes where code = upper(trim(p_code));
  if v_inviter is null then raise exception 'invite_not_found' using errcode = 'P0002'; end if;
  if v_inviter = v_user then raise exception 'invite_own_code' using errcode = 'P0001'; end if;
  if exists (select 1 from public.invite_redemptions where invitee_id = v_user) then raise exception 'invite_already_used' using errcode = 'P0001'; end if;
  select created_at into v_joined from public.profiles where id = v_user;
  if v_joined < now() - interval '14 days' then raise exception 'invite_too_late' using errcode = 'P0001'; end if;

  insert into public.invite_redemptions (invitee_id, inviter_id) values (v_user, v_inviter);
  insert into public.point_grants (user_id, reason, points, source_id) values (v_user, 'invite_joined', v_joined_pts, v_inviter::text);
  -- Already active (e.g. redeemed a few days in)? Reward the inviter now.
  perform private.reward_inviter(v_user);
  return jsonb_build_object('points', v_joined_pts);
end;
$$;

-- ----------------------------------------------------------- Reading time
-- At most 16 hours of timed reading a day, and a hand edit can add at most
-- 24 hours at once.
create or replace function public.log_reading_session(p_book uuid, p_seconds int)
returns table (minutes_today int, minutes_book int)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_today int;
  v_secs int := least(greatest(coalesce(p_seconds, 0), 0), 43200);
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select coalesce(sum(seconds), 0) into v_today from public.focus_sessions where user_id = v_user and ended_at >= date_trunc('day', now());
  v_secs := least(v_secs, 57600 - v_today);
  if v_secs < 1 then raise exception 'daily_reading_limit' using errcode = 'P0001'; end if;
  insert into public.focus_sessions (user_id, book_id, seconds) values (v_user, p_book, v_secs);
  if p_book is not null then
    update public.user_books set minutes_read = least(minutes_read + round(v_secs / 60.0)::int, 100000)
    where user_id = v_user and book_id = p_book;
  end if;
  return query
    select ((v_today + v_secs) / 60)::int,
           (select ub.minutes_read from public.user_books ub where ub.user_id = v_user and ub.book_id = p_book);
end;
$$;
revoke all on function public.log_reading_session(uuid, int) from public, anon;
grant execute on function public.log_reading_session(uuid, int) to authenticated;

create or replace function private.guard_minutes_read() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.minutes_read > old.minutes_read + 1440 then
    raise exception 'reading_time_limit' using errcode = 'P0001', hint = 'Add at most 24 hours at a time.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_minutes_read on public.user_books;
create trigger guard_minutes_read before update of minutes_read on public.user_books
  for each row execute function private.guard_minutes_read();

-- -------------------------------------------------------------- Tag privacy
-- Tag totals only count reviews you could read: public profiles, people you
-- follow, and your own.
create or replace function public.book_tags(p_books uuid[]) returns table (book_id uuid, tag text, n bigint)
language sql stable security definer set search_path = '' as $$
  select r.book_id, t.tag, count(*)
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  cross join unnest(r.tags) as t(tag)
  where r.book_id = any(p_books)
    and (not p.is_private or p.id = auth.uid()
         or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id and f.status = 'accepted'))
  group by r.book_id, t.tag
  order by 3 desc;
$$;
revoke all on function public.book_tags(uuid[]) from public, anon;
grant execute on function public.book_tags(uuid[]) to authenticated;
