-- GriMore — review tags, time spent reading, reading sessions, the
-- "what to read next" wheel and the My Grimore library rooms.

-- ------------------------------------------------------------ Review tags
-- A fixed set of phrases readers can pin on a review. Trope tags double as
-- the tropes the wheel filters by.
create or replace function private.valid_review_tags(t text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(cardinality(t), 0) <= 8
     and t <@ array[
       'brain-chemistry', 'book-boyfriend', 'enemies-to-lovers', 'forced-proximity',
       'slow-burn', 'love-triangle', 'found-family', 'morally-grey', 'grumpy-sunshine',
       'fake-dating', 'second-chance', 'chosen-one', 'plot-twist', 'cried', 'unputdownable'
     ]::text[];
$$;
alter table public.reviews add column if not exists tags text[] not null default '{}';
alter table public.reviews add constraint reviews_tags_check check (private.valid_review_tags(tags));
grant update (tags) on public.reviews to authenticated;
create index if not exists reviews_tags_idx on public.reviews using gin (tags);

-- The tags readers gave a set of books, most used first (for the wheel's trope filter and the book page).
create or replace function public.book_tags(p_books uuid[]) returns table (book_id uuid, tag text, n bigint)
language sql stable security definer set search_path = '' as $$
  select r.book_id, t.tag, count(*)
  from public.reviews r, unnest(r.tags) as t(tag)
  where r.book_id = any(p_books)
  group by r.book_id, t.tag
  order by 3 desc;
$$;
revoke all on function public.book_tags(uuid[]) from public, anon;
grant execute on function public.book_tags(uuid[]) to authenticated;

-- ------------------------------------------------------- Time spent reading
-- Minutes you spent with a book: added by timed reading sessions, editable by hand.
alter table public.user_books add column if not exists minutes_read int not null default 0 check (minutes_read between 0 and 100000);

-- (The timer's sessions table and log_reading_session are in migration 32.)

-- ------------------------------------------------------------------ Wheel
-- One spin and two rerolls a day (UTC days).
create table if not exists public.wheel_spins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  spins smallint not null default 0 check (spins between 0 and 3),
  last_book uuid references public.books(id) on delete set null,
  primary key (user_id, day)
);
alter table public.wheel_spins enable row level security;
create policy "own spins" on public.wheel_spins for select using (user_id = (select auth.uid()));

create or replace function public.wheel_spins_left() returns int
language sql stable security definer set search_path = '' as $$
  select 3 - coalesce((select spins from public.wheel_spins where user_id = auth.uid() and day = (now() at time zone 'utc')::date), 0);
$$;

-- Take a spin; the app chooses among the books it shows, the server only counts.
create or replace function public.use_wheel_spin(p_book uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_left int;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.wheel_spins (user_id) values (v_user) on conflict do nothing;
  update public.wheel_spins set spins = spins + 1, last_book = p_book
  where user_id = v_user and day = (now() at time zone 'utc')::date and spins < 3
  returning 3 - spins into v_left;
  if v_left is null then raise exception 'no_spins_left' using errcode = 'P0001'; end if;
  return v_left;
end;
$$;
revoke all on function public.wheel_spins_left(), public.use_wheel_spin(uuid) from public, anon;
grant execute on function public.wheel_spins_left(), public.use_wheel_spin(uuid) to authenticated;

-- --------------------------------------------------------- Library rooms
-- The room your shelves stand in. The Classic library is free; the others
-- are unlocked with a purchase or with points.
alter table public.corner_items drop constraint if exists corner_items_key_check;
alter table public.corner_items drop constraint if exists corner_items_kind_check;
alter table public.corner_items add constraint corner_items_key_check check (key ~ '^(theme|frame|shelf|name|pack|badge|icon|ribbon|laurel|card|library):[a-z0-9-]+$');
alter table public.corner_items add constraint corner_items_kind_check check (kind in ('theme','frame','shelf','name','pack','badge','icon','ribbon','laurel','card','library'));

insert into public.corner_items (key, kind, name, price_cents, sort_order, source) values
  ('library:classic', 'library', 'Classic Library', null, 1, 'shop'),
  ('library:hobbit', 'library', 'Hillside Library', 199, 2, 'shop'),
  ('library:palace', 'library', 'Palace Library', 199, 3, 'shop'),
  ('library:academia', 'library', 'Dark Academia Library', 199, 4, 'shop')
on conflict (key) do nothing;

insert into public.point_rewards (id, kind, title, description, cost_points, item_key, sort_order)
select 'item-' || replace(ci.key, ':', '-'), 'corner_item', ci.name, 'A new room for your shelves', 900, ci.key, 0
from public.corner_items ci
where ci.kind = 'library' and ci.price_cents is not null
  and not exists (select 1 from public.point_rewards r where r.item_key = ci.key);

alter table public.corners add column if not exists library text not null default 'classic';

create or replace function private.corners_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  it public.corner_items;
  v_house text;
begin
  select house_id into v_house from public.profiles where id = new.user_id;
  foreach v_key in array array['theme:' || new.theme, 'frame:' || new.frame, 'shelf:' || new.shelf,
                               'name:' || new.name_style, 'pack:' || new.pack, 'library:' || new.library]
  loop
    select * into it from public.corner_items where key = v_key;
    if not found then raise exception 'unknown_item %', v_key using errcode = '22023'; end if;
    if it.source = 'starter' and it.house_id is distinct from v_house then
      raise exception 'item_house_locked' using errcode = '42501';
    end if;
    if it.source = 'earned' and not exists (
      select 1 from public.user_items u where u.user_id = new.user_id and u.item_key = v_key and (u.expires_at is null or u.expires_at > now())
    ) then
      raise exception 'item_not_earned' using errcode = '42501';
    end if;
    if it.price_cents is not null and not exists (select 1 from public.corner_purchases where user_id = new.user_id and item_key = v_key)
       and not exists (select 1 from public.user_items u where u.user_id = new.user_id and u.item_key = v_key) then
      raise exception 'item_not_owned' using errcode = '42501', hint = 'Purchases are coming soon.';
    end if;
  end loop;
  if new.community_banner_id is not null and not private.has_paid_access(new.user_id, new.community_banner_id) then
    raise exception 'community_banner_members_only' using errcode = '42501';
  end if;
  return new;
end;
$$;
