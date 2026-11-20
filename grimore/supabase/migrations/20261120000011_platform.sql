-- GriMore — 0011 Platform v2
--
-- Adds what the v2 app needs on top of the existing schema, without touching
-- existing rows:
--   * library: owned copies, book moods, daily page goal, progress logging and reading streak
--   * profiles: reader archetype and city
--   * posts: progress / quote / finished / free posts, audiences, community posts
--   * direct messages (realtime)
--   * communities: members, threads, replies, events, match suggestions
--   * market: listings, trade offers, wish alerts
--   * Corner: theme/frame/shelf/name/pack/widgets, shop catalogue, purchases, guestbook
-- Payments are not wired: paid items and paid tiers can only be granted by the
-- service role (a future payment webhook). The app shows "Coming soon".

-- ---------------------------------------------------------------------------
-- Library & profile additions
-- ---------------------------------------------------------------------------
alter table public.user_books add column if not exists is_owned boolean not null default false;

alter table public.books add column if not exists moods text[] not null default '{}';

alter table public.profiles
  add column if not exists archetype text
    check (archetype in ('night', 'saga', 'quotes', 'archive', 'sprint')),
  add column if not exists city text check (char_length(city) <= 60);

grant update (archetype, city) on public.profiles to authenticated;

alter table public.user_preferences
  add column if not exists daily_pages_goal int not null default 20 check (daily_pages_goal between 1 and 1000),
  add column if not exists appearance text not null default 'dark' check (appearance in ('dark', 'light', 'system')),
  add column if not exists notification_settings jsonb not null default
    '{"follows": true, "likes": true, "comments": true, "games": true, "market": true, "communities": true, "messages": true}'::jsonb;

-- Notifications can now point at listings, offers, communities and threads.
alter table public.notifications add column if not exists data jsonb not null default '{}'::jsonb;

create or replace function private.notify_data(
  p_recipient uuid, p_actor uuid, p_type public.notification_type, p_data jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  if p_actor is not null and private.is_blocked_between(p_recipient, p_actor) then return; end if;
  insert into public.notifications (recipient_id, actor_id, type, data)
  values (p_recipient, p_actor, p_type, coalesce(p_data, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Posts v2
-- ---------------------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  name text not null check (char_length(trim(name)) between 3 and 60),
  tagline text check (char_length(tagline) <= 160),
  description text check (char_length(description) <= 4000),
  cover_scene text not null default 'great-hall'
    check (cover_scene in ('great-hall', 'candlelit-study', 'wizard-tower', 'dragon-archive', 'elven-library', 'moonlit-reading-room')),
  host_id uuid not null references public.profiles (id) on delete cascade,
  -- Monthly price of the first paid tier, in cents; null = free community.
  price_cents int check (price_cents is null or price_cents between 99 and 9999),
  max_members int check (max_members is null or max_members between 2 and 100000),
  rules jsonb not null default '{"spoiler_tags": true, "approve_members": false, "live_sessions": true}'::jsonb,
  reading_book_id uuid references public.books (id) on delete set null,
  reading_note text check (char_length(reading_note) <= 140),
  member_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger communities_updated_at before update on public.communities
  for each row execute function private.set_updated_at();
create trigger communities_rate_limit before insert on public.communities
  for each row execute function private.enforce_rate_limit('3', '1 day', 'host_id');
create index communities_host_idx on public.communities (host_id);
create index communities_reading_idx on public.communities (reading_book_id);

alter table public.posts alter column body drop not null;
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts
  add constraint posts_body_length check (body is null or char_length(trim(body)) between 1 and 4000),
  add column if not exists page int check (page between 0 and 50000),
  add column if not exists quote text check (char_length(trim(quote)) between 1 and 1000),
  add column if not exists stars numeric(2, 1) check (stars between 0.5 and 5 and stars * 2 = floor(stars * 2)),
  add column if not exists days int check (days between 0 and 3650),
  add column if not exists audience text not null default 'public' check (audience in ('public', 'followers', 'community')),
  add column if not exists community_id uuid references public.communities (id) on delete cascade;
alter table public.posts
  add constraint posts_has_content check (
    (kind = 'progress' and page is not null and book_id is not null)
    or (kind = 'quote' and quote is not null and book_id is not null)
    or (kind = 'finished' and book_id is not null)
    or body is not null
  ),
  add constraint posts_community_audience check ((audience = 'community') = (community_id is not null));
create index posts_community_idx on public.posts (community_id, created_at desc) where community_id is not null;

revoke update on public.posts from authenticated;
grant update (kind, body, book_id, has_spoilers, page, quote, stars, days, audience) on public.posts to authenticated;

-- Feed view gains the new post fields (columns appended at the end).
create or replace view public.feed_items
with (security_invoker = true)
as
  select 'post'::text as item_type, p.id, p.user_id, p.book_id, p.kind::text as kind,
    null::numeric as rating, null::text as headline, p.body, p.has_spoilers,
    p.like_count, p.comment_count, p.created_at,
    p.page, p.quote, p.stars, p.days, p.audience, p.community_id
  from public.posts p
  union all
  select 'review'::text, r.id, r.user_id, r.book_id, 'review'::text,
    r.rating, r.headline, r.body, r.has_spoilers,
    r.like_count, r.comment_count, r.created_at,
    null::int, null::text, r.rating, null::int, 'public'::text, null::uuid
  from public.reviews r;
grant select on public.feed_items to authenticated;

-- ---------------------------------------------------------------------------
-- Communities
-- ---------------------------------------------------------------------------
create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'moderator', 'member')),
  -- visitor/member are free; circle/patron are paid tiers (service role only).
  tier text not null default 'member' check (tier in ('visitor', 'member', 'circle', 'patron')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);

create or replace function private.is_community_member(p_community uuid, p_paid_only boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = p_community and m.user_id = auth.uid()
      and (not p_paid_only or m.tier in ('circle', 'patron') or m.role in ('host', 'moderator'))
  )
$$;
grant execute on function private.is_community_member(uuid, boolean) to authenticated;

create table public.community_threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text check (char_length(body) <= 8000),
  book_id uuid references public.books (id) on delete set null,
  has_spoilers boolean not null default false,
  members_only boolean not null default false,
  is_pinned boolean not null default false,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger community_threads_updated_at before update on public.community_threads
  for each row execute function private.set_updated_at();
create trigger community_threads_rate_limit before insert on public.community_threads
  for each row execute function private.enforce_rate_limit('20', '1 hour');
create index community_threads_community_idx on public.community_threads (community_id, is_pinned desc, created_at desc);
create index community_threads_user_idx on public.community_threads (user_id);
create index community_threads_book_idx on public.community_threads (book_id);

create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  has_spoilers boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger community_replies_rate_limit before insert on public.community_replies
  for each row execute function private.enforce_rate_limit('60', '10 minutes');
create index community_replies_thread_idx on public.community_replies (thread_id, created_at);
create index community_replies_user_idx on public.community_replies (user_id);

create table public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  details text check (char_length(details) <= 1000),
  starts_at timestamptz not null,
  format text not null default 'audio' check (format in ('audio', 'video', 'in_person', 'sprint')),
  members_only boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index community_events_community_idx on public.community_events (community_id, starts_at);
create index community_events_created_by_idx on public.community_events (created_by);

-- Host becomes a member; counters and notifications.
create or replace function private.communities_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.community_members (community_id, user_id, role, tier)
  values (new.id, new.host_id, 'host', 'patron')
  on conflict do nothing;
  return new;
end;
$$;
create trigger communities_host_member after insert on public.communities
  for each row execute function private.communities_after_insert();

create or replace function private.community_counters()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_thread public.community_threads;
begin
  if tg_table_name = 'community_members' then
    v_id := coalesce(new.community_id, old.community_id);
    update public.communities set member_count =
      (select count(*) from public.community_members where community_id = v_id)
    where id = v_id;
  elsif tg_table_name = 'community_replies' then
    v_id := coalesce(new.thread_id, old.thread_id);
    update public.community_threads set reply_count =
      (select count(*) from public.community_replies where thread_id = v_id)
    where id = v_id returning * into v_thread;
    if tg_op = 'INSERT' then
      perform private.notify_data(v_thread.user_id, new.user_id, 'community',
        jsonb_build_object('community_id', v_thread.community_id, 'thread_id', v_id, 'event', 'reply'));
    end if;
  elsif tg_table_name = 'community_threads' and tg_op = 'INSERT' then
    -- Tell the host and moderators about new threads (not every member: no spam).
    insert into public.notifications (recipient_id, actor_id, type, data)
    select m.user_id, new.user_id, 'community',
      jsonb_build_object('community_id', new.community_id, 'thread_id', new.id, 'event', 'thread')
    from public.community_members m
    where m.community_id = new.community_id and m.role in ('host', 'moderator') and m.user_id <> new.user_id
      and not private.is_blocked_between(m.user_id, new.user_id);
  end if;
  return null;
end;
$$;
create trigger community_members_counter after insert or delete on public.community_members
  for each row execute function private.community_counters();
create trigger community_replies_counter after insert or delete on public.community_replies
  for each row execute function private.community_counters();
create trigger community_threads_notify after insert on public.community_threads
  for each row execute function private.community_counters();

-- The host can't leave their own community (delete it instead).
create or replace function private.community_members_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'host' and exists (select 1 from public.communities c where c.id = old.community_id) then
    raise exception 'host_cannot_leave' using errcode = '42501';
  end if;
  return old;
end;
$$;
create trigger community_members_guard before delete on public.community_members
  for each row execute function private.community_members_guard();

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_threads enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_events enable row level security;

create policy "communities are discoverable" on public.communities
  for select to authenticated using (true);
create policy "users host communities" on public.communities
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "hosts edit communities" on public.communities
  for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "hosts delete communities" on public.communities
  for delete to authenticated using (host_id = (select auth.uid()));
revoke update on public.communities from authenticated;
grant update (name, tagline, description, cover_scene, price_cents, max_members, rules, reading_book_id, reading_note)
  on public.communities to authenticated;

create policy "members are visible" on public.community_members
  for select to authenticated using (true);
-- Free join only; paid tiers are granted by the service role after payment.
create policy "users join for free" on public.community_members
  for insert to authenticated with check (
    user_id = (select auth.uid()) and role = 'member'
    and tier = (case when (select c.price_cents from public.communities c where c.id = community_id) is null
                     then 'member' else 'visitor' end)
    and coalesce((select c.max_members is null or c.member_count < c.max_members
                  from public.communities c where c.id = community_id), false)
  );
create policy "members leave, hosts remove" on public.community_members
  for delete to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.communities c where c.id = community_id and c.host_id = (select auth.uid()))
  );
create policy "hosts set roles" on public.community_members
  for update to authenticated
  using (exists (select 1 from public.communities c where c.id = community_id and c.host_id = (select auth.uid())))
  with check (exists (select 1 from public.communities c where c.id = community_id and c.host_id = (select auth.uid())));
revoke update on public.community_members from authenticated;
grant update (role) on public.community_members to authenticated;

create policy "threads visible to members (paid ones to paid tiers)" on public.community_threads
  for select to authenticated using (
    not private.is_blocked_between(user_id, (select auth.uid()))
    and (case when members_only then private.is_community_member(community_id, true)
              else true end)
  );
create policy "members start threads" on public.community_threads
  for insert to authenticated with check (
    user_id = (select auth.uid()) and private.is_community_member(community_id)
    and (not members_only or private.is_community_member(community_id, true))
    and not is_pinned
  );
create policy "authors and hosts edit threads" on public.community_threads
  for update to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.communities c where c.id = community_id and c.host_id = (select auth.uid()))
  );
create policy "authors and hosts delete threads" on public.community_threads
  for delete to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.communities c where c.id = community_id and c.host_id = (select auth.uid()))
  );
revoke update on public.community_threads from authenticated;
grant update (title, body, has_spoilers, is_pinned) on public.community_threads to authenticated;

create policy "replies visible with their thread" on public.community_replies
  for select to authenticated using (
    not private.is_blocked_between(user_id, (select auth.uid()))
    and exists (select 1 from public.community_threads t where t.id = thread_id)
  );
create policy "members reply" on public.community_replies
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.community_threads t
                where t.id = thread_id and private.is_community_member(t.community_id))
  );
create policy "authors delete replies" on public.community_replies
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "events visible" on public.community_events
  for select to authenticated using (true);
create policy "hosts schedule events" on public.community_events
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.community_members m
                where m.community_id = community_events.community_id and m.user_id = (select auth.uid())
                  and m.role in ('host', 'moderator'))
  );
create policy "hosts delete events" on public.community_events
  for delete to authenticated using (created_by = (select auth.uid()));

-- Posts: audience-aware visibility.
drop policy if exists "posts visible to permitted viewers" on public.posts;
create policy "posts visible to permitted viewers" on public.posts
  for select to authenticated using (
    user_id = (select auth.uid())
    or (
      private.can_view_user(user_id)
      and (
        audience = 'public'
        or (audience = 'followers' and exists (
              select 1 from public.follows f
              where f.follower_id = (select auth.uid()) and f.followee_id = posts.user_id and f.status = 'accepted'))
        or (audience = 'community' and private.is_community_member(community_id))
      )
    )
  );
drop policy if exists "users publish as themselves" on public.posts;
create policy "users publish as themselves" on public.posts
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (community_id is null or private.is_community_member(community_id))
  );

-- Community suggestions: overlap between the reader's library and what the
-- community's members read, plus the current book's genre.
create or replace function public.suggest_communities(p_limit int default 20)
returns table (id uuid, match int)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select ub.book_id from public.user_books ub where ub.user_id = auth.uid()
  ), my_genres as (
    select distinct bg.genre_id from public.book_genres bg join mine on mine.book_id = bg.book_id
    union
    select genre_id from public.user_favorite_genres where user_id = auth.uid()
  ), scored as (
    select c.id,
      (select count(distinct ub.book_id) from public.community_members m
         join public.user_books ub on ub.user_id = m.user_id
         join mine on mine.book_id = ub.book_id
       where m.community_id = c.id and m.user_id <> auth.uid()) as shared_books,
      exists (select 1 from public.book_genres bg join my_genres g on g.genre_id = bg.genre_id
              where bg.book_id = c.reading_book_id) as genre_hit,
      c.member_count
    from public.communities c
  )
  select s.id,
    least(99, 55 + least(s.shared_books, 20) * 2 + case when s.genre_hit then 12 else 0 end
              + least(s.member_count, 50) / 10)::int as match
  from scored s
  order by match desc, s.member_count desc
  limit greatest(1, least(p_limit, 50))
$$;
revoke execute on function public.suggest_communities(int) from public, anon;
grant execute on function public.suggest_communities(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Direct messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Ordered pair so there is exactly one DM per two readers.
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_user_b_idx on public.conversations (user_b);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_reads_user_idx on public.conversation_reads (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text check (char_length(trim(body)) between 1 and 4000),
  book_id uuid references public.books (id) on delete set null,
  listing_id uuid,
  created_at timestamptz not null default now(),
  check (body is not null or book_id is not null or listing_id is not null)
);
create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.enforce_rate_limit('120', '10 minutes', 'sender_id');
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);
create index messages_book_idx on public.messages (book_id);

create or replace function private.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                 where c.id = p_conversation and auth.uid() in (c.user_a, c.user_b))
$$;
grant execute on function private.is_conversation_member(uuid) to authenticated;

create or replace function private.messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_c public.conversations;
begin
  select * into v_c from public.conversations where id = new.conversation_id;
  if private.is_blocked_between(v_c.user_a, v_c.user_b) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_block_guard before insert on public.messages
  for each row execute function private.messages_before_insert();

create or replace function private.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(coalesce(new.body, case when new.listing_id is not null then 'Shared a listing' else 'Shared a book' end), 120)
  where id = new.conversation_id;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, new.created_at)
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function private.messages_after_insert();

alter table public.conversations enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.messages enable row level security;

create policy "participants see conversations" on public.conversations
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
create policy "participants see read markers" on public.conversation_reads
  for select to authenticated using (private.is_conversation_member(conversation_id));
create policy "participants read messages" on public.messages
  for select to authenticated using (private.is_conversation_member(conversation_id));
create policy "participants send messages" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and private.is_conversation_member(conversation_id)
  );
create policy "senders delete messages" on public.messages
  for delete to authenticated using (sender_id = (select auth.uid()));
revoke update on public.messages from authenticated;
revoke insert, update, delete on public.conversations from authenticated;
revoke insert, update, delete on public.conversation_reads from authenticated;

create or replace function public.open_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_other is null or p_other = v_me then raise exception 'invalid_recipient' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if private.is_blocked_between(v_me, p_other) then raise exception 'blocked' using errcode = '42501'; end if;
  v_a := least(v_me, p_other);
  v_b := greatest(v_me, p_other);
  insert into public.conversations (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do nothing;
  select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
  return v_id;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_conversation_member(p_conversation) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.conversation_reads (conversation_id, user_id) values (p_conversation, auth.uid())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end;
$$;

create or replace function public.list_conversations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.last_message_at desc nulls last), '[]'::jsonb)
  from (
    select c.id, c.last_message_at, c.last_message_preview,
      o.id as other_id, o.username as other_username, o.display_name as other_display_name,
      o.avatar_url as other_avatar_url,
      (select count(*) from public.messages m
        where m.conversation_id = c.id and m.sender_id <> auth.uid()
          and m.created_at > coalesce((select r.last_read_at from public.conversation_reads r
                                       where r.conversation_id = c.id and r.user_id = auth.uid()), '-infinity'))::int as unread
    from public.conversations c
    join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
    where auth.uid() in (c.user_a, c.user_b) and c.last_message_at is not null
      and not private.is_blocked_between(c.user_a, c.user_b)
  ) x
$$;

revoke execute on function public.open_conversation(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.list_conversations() from public, anon;
grant execute on function public.open_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.list_conversations() to authenticated;

-- Live chat.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Market
-- ---------------------------------------------------------------------------
create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  user_book_id uuid references public.user_books (id) on delete set null,
  mode text not null check (mode in ('sale', 'trade', 'both')),
  price_cents int check (price_cents between 0 and 1000000),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  condition text not null check (condition in ('like_new', 'very_good', 'good', 'used')),
  edition text check (char_length(edition) <= 140),
  note text check (char_length(note) <= 1000),
  is_rare boolean not null default false,
  city text check (char_length(city) <= 60),
  status text not null default 'active' check (status in ('active', 'reserved', 'sold', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mode = 'trade' or price_cents is not null)
);
create trigger market_listings_updated_at before update on public.market_listings
  for each row execute function private.set_updated_at();
create trigger market_listings_rate_limit before insert on public.market_listings
  for each row execute function private.enforce_rate_limit('30', '1 day', 'seller_id');
create index market_listings_active_idx on public.market_listings (status, created_at desc);
create index market_listings_book_idx on public.market_listings (book_id);
create index market_listings_seller_idx on public.market_listings (seller_id);
create index market_listings_user_book_idx on public.market_listings (user_book_id);

alter table public.messages
  add constraint messages_listing_fk foreign key (listing_id) references public.market_listings (id) on delete set null;
create index messages_listing_idx on public.messages (listing_id);

create table public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  offered_book_ids uuid[] not null default '{}' check (cardinality(offered_book_ids) <= 5),
  message text check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (cardinality(offered_book_ids) > 0 or message is not null)
);
create trigger trade_offers_rate_limit before insert on public.trade_offers
  for each row execute function private.enforce_rate_limit('20', '1 day', 'buyer_id');
create unique index trade_offers_one_pending on public.trade_offers (listing_id, buyer_id) where status = 'pending';
create index trade_offers_buyer_idx on public.trade_offers (buyer_id);

create table public.market_alerts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index market_alerts_book_idx on public.market_alerts (book_id);

create or replace function private.market_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_listing public.market_listings;
begin
  if tg_table_name = 'market_listings' then
    -- Wish alerts: readers who asked to be told when this book shows up.
    insert into public.notifications (recipient_id, actor_id, type, data)
    select a.user_id, new.seller_id, 'market',
      jsonb_build_object('listing_id', new.id, 'book_id', new.book_id, 'event', 'alert')
    from public.market_alerts a
    where a.book_id = new.book_id and a.user_id <> new.seller_id
      and not private.is_blocked_between(a.user_id, new.seller_id);
  elsif tg_table_name = 'trade_offers' then
    select * into v_listing from public.market_listings where id = new.listing_id;
    if v_listing.seller_id = new.buyer_id then
      raise exception 'own_listing' using errcode = '22023';
    end if;
    if v_listing.status <> 'active' or v_listing.mode = 'sale' and cardinality(new.offered_book_ids) > 0 then
      raise exception 'listing_unavailable' using errcode = '22023';
    end if;
    if private.is_blocked_between(v_listing.seller_id, new.buyer_id) then
      raise exception 'blocked' using errcode = '42501';
    end if;
    perform private.notify_data(v_listing.seller_id, new.buyer_id, 'trade',
      jsonb_build_object('listing_id', new.listing_id, 'offer_id', new.id, 'event', 'offer'));
  end if;
  return new;
end;
$$;
create trigger market_listings_alerts after insert on public.market_listings
  for each row execute function private.market_notify();
create trigger trade_offers_validate before insert on public.trade_offers
  for each row execute function private.market_notify();

alter table public.market_listings enable row level security;
alter table public.trade_offers enable row level security;
alter table public.market_alerts enable row level security;

create policy "listings visible" on public.market_listings
  for select to authenticated using (
    seller_id = (select auth.uid())
    or (status in ('active', 'reserved') and not private.is_blocked_between(seller_id, (select auth.uid())))
  );
create policy "sellers list their books" on public.market_listings
  for insert to authenticated with check (
    seller_id = (select auth.uid()) and status = 'active'
    and (user_book_id is null or exists (select 1 from public.user_books ub
                                          where ub.id = user_book_id and ub.user_id = (select auth.uid())))
  );
create policy "sellers edit listings" on public.market_listings
  for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "sellers delete listings" on public.market_listings
  for delete to authenticated using (seller_id = (select auth.uid()));
revoke update on public.market_listings from authenticated;
grant update (mode, price_cents, condition, edition, note, is_rare, city, status) on public.market_listings to authenticated;

create policy "offer parties see offers" on public.trade_offers
  for select to authenticated using (
    buyer_id = (select auth.uid())
    or exists (select 1 from public.market_listings l where l.id = listing_id and l.seller_id = (select auth.uid()))
  );
create policy "buyers make offers" on public.trade_offers
  for insert to authenticated with check (buyer_id = (select auth.uid()) and status = 'pending');
create policy "buyers withdraw offers" on public.trade_offers
  for update to authenticated
  using (buyer_id = (select auth.uid()) and status = 'pending')
  with check (buyer_id = (select auth.uid()) and status = 'withdrawn');
revoke update on public.trade_offers from authenticated;
grant update (status) on public.trade_offers to authenticated;

create policy "users manage their alerts" on public.market_alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users add alerts" on public.market_alerts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users remove alerts" on public.market_alerts
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.respond_trade(p_offer uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.trade_offers;
  v_listing public.market_listings;
begin
  select * into v_offer from public.trade_offers where id = p_offer for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_listing from public.market_listings where id = v_offer.listing_id for update;
  if v_listing.seller_id is distinct from auth.uid() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_offer.status <> 'pending' then raise exception 'already_answered' using errcode = '22023'; end if;

  update public.trade_offers
  set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where id = p_offer;
  if p_accept then
    update public.market_listings set status = 'reserved' where id = v_listing.id;
  end if;
  perform private.notify_data(v_offer.buyer_id, auth.uid(), 'trade',
    jsonb_build_object('listing_id', v_listing.id, 'offer_id', p_offer,
                       'event', case when p_accept then 'accepted' else 'declined' end));
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end);
end;
$$;
revoke execute on function public.respond_trade(uuid, boolean) from public, anon;
grant execute on function public.respond_trade(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Reading progress & streak
-- ---------------------------------------------------------------------------
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
revoke execute on function public.log_progress(uuid, int, text, boolean, text) from public, anon;
grant execute on function public.log_progress(uuid, int, text, boolean, text) to authenticated;

-- Consecutive UTC days with logged pages, today's pages and the daily goal.
create or replace function public.get_reading_streak(p_user uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  v_today date := (now() at time zone 'utc')::date;
  v_day date;
  v_current int := 0;
  v_longest int := 0;
  v_run int := 0;
  v_prev date;
  v_today_pages int;
  v_week jsonb;
begin
  if not private.can_view_user(v_user) then raise exception 'not_found' using errcode = 'P0002'; end if;

  select coalesce(sum(pages_read), 0) into v_today_pages from public.reading_sessions
  where user_id = v_user and (created_at at time zone 'utc')::date = v_today;

  for v_day in
    select distinct (created_at at time zone 'utc')::date d from public.reading_sessions
    where user_id = v_user and pages_read > 0 order by d
  loop
    if v_prev is not null and v_day = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
    v_longest := greatest(v_longest, v_run);
    v_prev := v_day;
  end loop;
  if v_prev is not null and v_prev >= v_today - 1 then v_current := v_run; end if;

  select jsonb_agg(jsonb_build_object('date', d::date, 'pages', coalesce(
           (select sum(s.pages_read) from public.reading_sessions s
            where s.user_id = v_user and (s.created_at at time zone 'utc')::date = d::date), 0)) order by d)
  into v_week
  from generate_series(v_today - 6, v_today, interval '1 day') d;

  return jsonb_build_object(
    'current', v_current, 'longest', v_longest, 'today_pages', v_today_pages,
    'daily_goal', coalesce((select daily_pages_goal from public.user_preferences where user_id = v_user), 20),
    'week', v_week
  );
end;
$$;
revoke execute on function public.get_reading_streak(uuid) from public, anon;
grant execute on function public.get_reading_streak(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The Corner (profile page) — appearance, shop and guestbook
-- ---------------------------------------------------------------------------
create table public.corner_items (
  key text primary key check (key ~ '^(theme|frame|shelf|name|pack):[a-z0-9-]+$'),
  kind text not null check (kind in ('theme', 'frame', 'shelf', 'name', 'pack')),
  name text not null,
  price_cents int check (price_cents is null or price_cents > 0),
  sort_order int not null default 0
);
alter table public.corner_items enable row level security;
create policy "shop catalogue is public" on public.corner_items for select to authenticated using (true);

insert into public.corner_items (key, kind, name, price_cents, sort_order) values
  ('theme:graphite', 'theme', 'Graphite', null, 1),
  ('theme:ember', 'theme', 'Ember', null, 2),
  ('theme:forest', 'theme', 'Forest', null, 3),
  ('theme:cobalt', 'theme', 'Cobalt', null, 4),
  ('theme:plum', 'theme', 'Plum', null, 5),
  ('theme:ocean', 'theme', 'Tide', null, 6),
  ('theme:holo', 'theme', 'Holographic', 199, 7),
  ('theme:night', 'theme', 'Night sky', 149, 8),
  ('theme:aurora', 'theme', 'Living aurora', 249, 9),
  ('theme:great-hall', 'theme', 'Great hall', 199, 10),
  ('theme:dragon-archive', 'theme', 'Dragon archive', 199, 11),
  ('theme:moonlit-reading-room', 'theme', 'Moonlit room', 99, 12),
  ('frame:none', 'frame', 'No frame', null, 1),
  ('frame:ember', 'frame', 'Ember', null, 2),
  ('frame:ink', 'frame', 'Ink', null, 3),
  ('frame:aurora', 'frame', 'Aurora', 149, 4),
  ('frame:gold', 'frame', 'Gold', 99, 5),
  ('frame:moon', 'frame', 'Moon', 99, 6),
  ('frame:leaves', 'frame', 'Leaves', 149, 7),
  ('shelf:theme', 'shelf', 'Theme', null, 1),
  ('shelf:oak', 'shelf', 'Oak', null, 2),
  ('shelf:white', 'shelf', 'Lacquer', null, 3),
  ('shelf:marble', 'shelf', 'Marble', 99, 4),
  ('shelf:neon', 'shelf', 'Neon', 149, 5),
  ('name:plain', 'name', 'Plain', null, 1),
  ('name:ember', 'name', 'Ember', 99, 2),
  ('name:holo', 'name', 'Holo', 149, 3),
  ('pack:none', 'pack', 'No stickers', null, 1),
  ('pack:reader', 'pack', 'Bookseller', null, 2),
  ('pack:gothic', 'pack', 'Gothic', 199, 3),
  ('pack:botanic', 'pack', 'Botanic', 149, 4),
  ('pack:cosmos', 'pack', 'Cosmos', 149, 5),
  ('pack:royal', 'pack', 'Court', 99, 6)
on conflict (key) do nothing;

create table public.corner_purchases (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null references public.corner_items (key) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
create index corner_purchases_item_idx on public.corner_purchases (item_key);
alter table public.corner_purchases enable row level security;
create policy "users see their purchases" on public.corner_purchases
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert policy: purchases are recorded by the service role once payments exist.

create table public.corners (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'forest',
  frame text not null default 'ember',
  shelf text not null default 'theme',
  name_style text not null default 'plain',
  pack text not null default 'reader',
  widgets text[] not null default array['status', 'top4', 'reading', 'goal', 'quote', 'shelf', 'badges', 'genres', 'tbr', 'guestbook'],
  status_text text check (char_length(status_text) <= 80),
  song text check (char_length(song) <= 80),
  pinned_review_id uuid references public.reviews (id) on delete set null,
  badge_ids text[] not null default '{}' check (cardinality(badge_ids) <= 6),
  updated_at timestamptz not null default now(),
  check (widgets <@ array['status', 'top4', 'reading', 'goal', 'year', 'quote', 'review', 'wrapped', 'badges',
                          'shelf', 'genres', 'authors', 'tbr', 'communities', 'guestbook']::text[])
);
create trigger corners_updated_at before update on public.corners
  for each row execute function private.set_updated_at();
create index corners_pinned_review_idx on public.corners (pinned_review_id);

-- Every choice must exist in the catalogue; paid ones must be owned.
create or replace function private.corners_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_price int;
begin
  foreach v_key in array array['theme:' || new.theme, 'frame:' || new.frame, 'shelf:' || new.shelf,
                               'name:' || new.name_style, 'pack:' || new.pack]
  loop
    select price_cents into v_price from public.corner_items where key = v_key;
    if not found then raise exception 'unknown_item %', v_key using errcode = '22023'; end if;
    if v_price is not null and not exists (
      select 1 from public.corner_purchases where user_id = new.user_id and item_key = v_key
    ) then
      raise exception 'item_not_owned' using errcode = '42501', hint = 'Purchases are coming soon.';
    end if;
  end loop;
  return new;
end;
$$;
create trigger corners_guard before insert or update on public.corners
  for each row execute function private.corners_guard();

alter table public.corners enable row level security;
create policy "corners visible like profiles" on public.corners
  for select to authenticated using (private.can_view_user(user_id));
create policy "owners create their corner" on public.corners
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners edit their corner" on public.corners
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Existing readers get a corner row.
insert into public.corners (user_id) select id from public.profiles on conflict do nothing;

create or replace function private.handle_new_profile_corner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.corners (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger profiles_corner after insert on public.profiles
  for each row execute function private.handle_new_profile_corner();

create table public.corner_guestbook (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create trigger corner_guestbook_rate_limit before insert on public.corner_guestbook
  for each row execute function private.enforce_rate_limit('20', '1 hour', 'author_id');
create index corner_guestbook_owner_idx on public.corner_guestbook (owner_id, created_at desc);
create index corner_guestbook_author_idx on public.corner_guestbook (author_id);
alter table public.corner_guestbook enable row level security;
create policy "guestbook visible with the corner" on public.corner_guestbook
  for select to authenticated using (
    private.can_view_user(owner_id) and not private.is_blocked_between(author_id, (select auth.uid()))
  );
create policy "visitors sign guestbooks" on public.corner_guestbook
  for insert to authenticated with check (
    author_id = (select auth.uid()) and private.can_view_user(owner_id)
    and not private.is_blocked_between(owner_id, author_id)
  );
create policy "authors and owners remove entries" on public.corner_guestbook
  for delete to authenticated using ((select auth.uid()) in (author_id, owner_id));
revoke update on public.corner_guestbook from authenticated;

-- ---------------------------------------------------------------------------
-- Hardening of new tables
-- ---------------------------------------------------------------------------
revoke all on public.communities, public.community_members, public.community_threads, public.community_replies,
  public.community_events, public.conversations, public.conversation_reads, public.messages,
  public.market_listings, public.trade_offers, public.market_alerts, public.corner_items,
  public.corner_purchases, public.corners, public.corner_guestbook from anon;
revoke insert, update, delete on public.corner_items from authenticated;
revoke insert, update, delete on public.corner_purchases from authenticated;
