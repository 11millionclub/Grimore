-- GriMore — six-star ratings, spice, priority wishlist and invite codes.

-- ------------------------------------------------------------ Six stars
-- Ratings go from half a star to six stars (existing 1-5 ratings stay valid).
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass::text as tbl, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.user_books'::regclass, 'public.reviews'::regclass, 'public.posts'::regclass)
      and (pg_get_constraintdef(c.oid) ilike '%rating%' or pg_get_constraintdef(c.oid) ilike '%stars%')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end;
$$;
alter table public.user_books add constraint user_books_rating_check check (rating between 0.5 and 6 and rating * 2 = floor(rating * 2));
alter table public.reviews add constraint reviews_rating_check check (rating between 0.5 and 6 and rating * 2 = floor(rating * 2));
alter table public.posts add constraint posts_stars_check check (stars between 0.5 and 6 and stars * 2 = floor(stars * 2));

-- ---------------------------------------------------------------- Spice
-- 0 (none) to 5 chillies, on your library entry and on your review.
alter table public.user_books add column if not exists spice smallint check (spice between 0 and 5);
alter table public.reviews add column if not exists spice smallint check (spice between 0 and 5);
grant update (rating, headline, body, has_spoilers, spice) on public.reviews to authenticated;

-- ------------------------------------------------------ Priority wishlist
-- A few "read these next" books inside the wishlist (Want to read).
alter table public.user_books add column if not exists is_priority boolean not null default false;
create index if not exists user_books_priority_idx on public.user_books (user_id) where is_priority;

-- ---------------------------------------------------------------- Invites
-- Each reader has one personal code. A new reader can redeem one code in
-- their first 14 days; both get points in their personal wallet (not the
-- House Cup, so invites cannot be farmed to move the standings).
create table public.invite_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
create policy "own invite code" on public.invite_codes for select using (user_id = (select auth.uid()));

create table public.invite_redemptions (
  invitee_id uuid primary key references public.profiles(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (invitee_id <> inviter_id)
);
create index invite_redemptions_inviter_idx on public.invite_redemptions (inviter_id);
alter table public.invite_redemptions enable row level security;
create policy "own invites" on public.invite_redemptions for select using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()));

-- Bonus points outside the House ledger (invites now, other rewards later).
create table public.point_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('invite_sent', 'invite_joined')),
  points int not null check (points between 1 and 1000),
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, source_id)
);
alter table public.point_grants enable row level security;
create policy "own grants" on public.point_grants for select using (user_id = (select auth.uid()));

create or replace function public.my_invite_code() returns text
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_code text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select code into v_code from public.invite_codes where user_id = v_user;
  if v_code is not null then return v_code; end if;
  loop
    -- No 0/O/1/I so codes are easy to read aloud.
    v_code := array_to_string(array(select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1) from generate_series(1, 8)), '');
    begin
      insert into public.invite_codes (user_id, code) values (v_user, v_code);
      return v_code;
    exception when unique_violation then
      if exists (select 1 from public.invite_codes where user_id = v_user) then
        return (select code from public.invite_codes where user_id = v_user);
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.redeem_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_inviter uuid;
  v_joined timestamptz;
  v_sent int := 100;
  v_joined_pts int := 50;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select user_id into v_inviter from public.invite_codes where code = upper(trim(p_code));
  if v_inviter is null then raise exception 'invite_not_found' using errcode = 'P0002'; end if;
  if v_inviter = v_user then raise exception 'invite_own_code' using errcode = 'P0001'; end if;
  if exists (select 1 from public.invite_redemptions where invitee_id = v_user) then raise exception 'invite_already_used' using errcode = 'P0001'; end if;
  select created_at into v_joined from public.profiles where id = v_user;
  if v_joined < now() - interval '14 days' then raise exception 'invite_too_late' using errcode = 'P0001'; end if;
  -- An inviter is rewarded for at most 50 readers.
  if (select count(*) from public.invite_redemptions where inviter_id = v_inviter) >= 50 then v_sent := 0; end if;

  insert into public.invite_redemptions (invitee_id, inviter_id) values (v_user, v_inviter);
  insert into public.point_grants (user_id, reason, points, source_id) values (v_user, 'invite_joined', v_joined_pts, v_inviter::text);
  if v_sent > 0 then
    insert into public.point_grants (user_id, reason, points, source_id) values (v_inviter, 'invite_sent', v_sent, v_user::text);
  end if;
  return jsonb_build_object('points', v_joined_pts);
end;
$$;

-- The wallet counts House points and bonus grants, minus what was spent.
create or replace function public.my_wallet() returns table (earned bigint, spent bigint, balance bigint)
language sql stable security definer set search_path = '' as $$
  with e as (
    select (select coalesce(sum(points), 0) from public.house_points where user_id = auth.uid())
         + (select coalesce(sum(points), 0) from public.point_grants where user_id = auth.uid()) as n
  ),
  s as (select coalesce(sum(points), 0)::bigint as n from public.point_redemptions where user_id = auth.uid())
  select e.n::bigint, s.n, e.n::bigint - s.n from e, s;
$$;

revoke all on function public.my_invite_code(), public.redeem_invite(text) from public, anon;
grant execute on function public.my_invite_code(), public.redeem_invite(text) to authenticated;
