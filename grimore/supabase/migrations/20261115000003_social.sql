-- GriMore — 0003 Social graph, posts, reviews, moderation

create type public.post_kind as enum ('thought', 'question', 'recommendation', 'reading_update', 'discussion');
create type public.follow_status as enum ('accepted', 'pending');
create type public.report_reason as enum ('spam', 'harassment', 'hate', 'spoiler', 'sexual', 'violence', 'misinformation', 'other');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.notification_type as enum (
  'follow', 'follow_request', 'follow_accepted', 'post_like', 'post_comment',
  'review_like', 'review_comment', 'comment_reply', 'achievement'
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status public.follow_status not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, status);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- Visibility helpers (trusted, used by RLS policies)
-- ---------------------------------------------------------------------------
create or replace function private.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- Can the current user see content owned by p_owner?
create or replace function private.can_view_user(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_owner = auth.uid()
    or (
      auth.uid() is not null
      and not private.is_blocked_between(p_owner, auth.uid())
      and (
        not coalesce((select is_private from public.profiles where id = p_owner), true)
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followee_id = p_owner and f.status = 'accepted'
        )
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.post_kind not null default 'thought',
  body text not null check (char_length(trim(body)) between 1 and 4000),
  book_id uuid references public.books (id) on delete set null,
  has_spoilers boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'recommendation' or book_id is not null)
);
create trigger posts_updated_at before update on public.posts
  for each row execute function private.set_updated_at();
create trigger posts_rate_limit before insert on public.posts
  for each row execute function private.enforce_rate_limit('20', '1 hour');
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_book_idx on public.posts (book_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.post_comments (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger post_comments_updated_at before update on public.post_comments
  for each row execute function private.set_updated_at();
create trigger post_comments_rate_limit before insert on public.post_comments
  for each row execute function private.enforce_rate_limit('60', '10 minutes');
create index post_comments_post_idx on public.post_comments (post_id, created_at);
create index post_comments_user_idx on public.post_comments (user_id);
create index post_comments_parent_idx on public.post_comments (parent_id);

create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'like' check (kind in ('like')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);
create index post_reactions_user_idx on public.post_reactions (user_id);

-- ---------------------------------------------------------------------------
-- Reviews (always tied to a book)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  rating numeric(2, 1) not null check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  headline text check (char_length(headline) <= 140),
  body text check (char_length(body) <= 20000),
  has_spoilers boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();
create trigger reviews_rate_limit before insert on public.reviews
  for each row execute function private.enforce_rate_limit('20', '1 hour');
create index reviews_book_idx on public.reviews (book_id, created_at desc);
create index reviews_created_idx on public.reviews (created_at desc);
create index reviews_user_idx on public.reviews (user_id, created_at desc);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.review_comments (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger review_comments_updated_at before update on public.review_comments
  for each row execute function private.set_updated_at();
create trigger review_comments_rate_limit before insert on public.review_comments
  for each row execute function private.enforce_rate_limit('60', '10 minutes');
create index review_comments_review_idx on public.review_comments (review_id, created_at);
create index review_comments_user_idx on public.review_comments (user_id);
create index review_comments_parent_idx on public.review_comments (parent_id);

create table public.review_reactions (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'like' check (kind in ('like')),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id, kind)
);
create index review_reactions_user_idx on public.review_reactions (user_id);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, review_id) = 1)
);
create unique index saved_items_post_unique on public.saved_items (user_id, post_id) where post_id is not null;
create unique index saved_items_review_unique on public.saved_items (user_id, review_id) where review_id is not null;
create index saved_items_post_idx on public.saved_items (post_id);
create index saved_items_review_idx on public.saved_items (review_id);

-- ---------------------------------------------------------------------------
-- Notifications & moderation
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  post_id uuid references public.posts (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete cascade,
  achievement_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_post_idx on public.notifications (post_id);
create index notifications_review_idx on public.notifications (review_id);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  post_comment_id uuid references public.post_comments (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  review_comment_id uuid references public.review_comments (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (num_nonnulls(reported_user_id, post_id, post_comment_id, review_id, review_comment_id) >= 1)
);
create trigger content_reports_rate_limit before insert on public.content_reports
  for each row execute function private.enforce_rate_limit('10', '1 hour', 'reporter_id');
create index content_reports_status_idx on public.content_reports (status, created_at);
create index content_reports_reporter_idx on public.content_reports (reporter_id);
create index content_reports_user_idx on public.content_reports (reported_user_id);
create index content_reports_post_idx on public.content_reports (post_id);
create index content_reports_post_comment_idx on public.content_reports (post_comment_id);
create index content_reports_review_idx on public.content_reports (review_id);
create index content_reports_review_comment_idx on public.content_reports (review_comment_id);

-- ---------------------------------------------------------------------------
-- Trusted triggers: counters, follow status and notifications
-- ---------------------------------------------------------------------------
create or replace function private.notify(
  p_recipient uuid, p_actor uuid, p_type public.notification_type,
  p_post uuid default null, p_review uuid default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  if p_actor is not null and private.is_blocked_between(p_recipient, p_actor) then return; end if;
  insert into public.notifications (recipient_id, actor_id, type, post_id, review_id)
  values (p_recipient, p_actor, p_type, p_post, p_review);
end;
$$;

-- Following a private account creates a request instead.
create or replace function private.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_blocked_between(new.follower_id, new.followee_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  new.status := case
    when (select is_private from public.profiles where id = new.followee_id) then 'pending'::public.follow_status
    else 'accepted'::public.follow_status
  end;
  return new;
end;
$$;
create trigger follows_status before insert on public.follows
  for each row execute function private.follows_before_insert();

-- Only the followee may move a request from pending to accepted.
create or replace function private.follows_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.follower_id <> old.follower_id or new.followee_id <> old.followee_id
     or not (old.status = 'pending' and new.status = 'accepted') then
    raise exception 'invalid_follow_update' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger follows_update_guard before update on public.follows
  for each row execute function private.follows_before_update();

create or replace function private.follows_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_follower uuid := coalesce(new.follower_id, old.follower_id);
  v_followee uuid := coalesce(new.followee_id, old.followee_id);
begin
  update public.user_statistics set following_count = (
    select count(*) from public.follows where follower_id = v_follower and status = 'accepted'
  ) where user_id = v_follower;
  update public.user_statistics set followers_count = (
    select count(*) from public.follows where followee_id = v_followee and status = 'accepted'
  ) where user_id = v_followee;

  if tg_op = 'INSERT' then
    perform private.notify(new.followee_id, new.follower_id,
      case when new.status = 'pending' then 'follow_request'::public.notification_type
           else 'follow'::public.notification_type end);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    perform private.notify(new.follower_id, new.followee_id, 'follow_accepted');
  end if;
  return null;
end;
$$;
create trigger follows_after after insert or update or delete on public.follows
  for each row execute function private.follows_after_change();

-- Blocking removes any follow relationship in both directions.
create or replace function private.user_blocks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return null;
end;
$$;
create trigger user_blocks_after after insert on public.user_blocks
  for each row execute function private.user_blocks_after_insert();

create or replace function private.post_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post uuid;
  v_owner uuid;
begin
  if tg_table_name = 'post_reactions' then
    v_post := coalesce(new.post_id, old.post_id);
    update public.posts set like_count = (select count(*) from public.post_reactions where post_id = v_post)
    where id = v_post returning user_id into v_owner;
    if tg_op = 'INSERT' then perform private.notify(v_owner, new.user_id, 'post_like', v_post); end if;
  elsif tg_table_name = 'post_comments' then
    v_post := coalesce(new.post_id, old.post_id);
    update public.posts set comment_count = (select count(*) from public.post_comments where post_id = v_post)
    where id = v_post returning user_id into v_owner;
    if tg_op = 'INSERT' then
      perform private.notify(v_owner, new.user_id, 'post_comment', v_post);
      if new.parent_id is not null then
        perform private.notify((select user_id from public.post_comments where id = new.parent_id),
          new.user_id, 'comment_reply', v_post);
      end if;
    end if;
  elsif tg_table_name = 'review_reactions' then
    v_post := coalesce(new.review_id, old.review_id);
    update public.reviews set like_count = (select count(*) from public.review_reactions where review_id = v_post)
    where id = v_post returning user_id into v_owner;
    if tg_op = 'INSERT' then perform private.notify(v_owner, new.user_id, 'review_like', null, v_post); end if;
  elsif tg_table_name = 'review_comments' then
    v_post := coalesce(new.review_id, old.review_id);
    update public.reviews set comment_count = (select count(*) from public.review_comments where review_id = v_post)
    where id = v_post returning user_id into v_owner;
    if tg_op = 'INSERT' then
      perform private.notify(v_owner, new.user_id, 'review_comment', null, v_post);
      if new.parent_id is not null then
        perform private.notify((select user_id from public.review_comments where id = new.parent_id),
          new.user_id, 'comment_reply', null, v_post);
      end if;
    end if;
  end if;
  return null;
end;
$$;
create trigger post_reactions_counter after insert or delete on public.post_reactions
  for each row execute function private.post_counters();
create trigger post_comments_counter after insert or delete on public.post_comments
  for each row execute function private.post_counters();
create trigger review_reactions_counter after insert or delete on public.review_reactions
  for each row execute function private.post_counters();
create trigger review_comments_counter after insert or delete on public.review_comments
  for each row execute function private.post_counters();

-- Counters on posts/reviews may only be changed by the trusted triggers above.
create or replace function private.protect_counters()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('role', true) in ('authenticated', 'anon') and pg_trigger_depth() = 1 then
    new.like_count := old.like_count;
    new.comment_count := old.comment_count;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger posts_protect before update on public.posts
  for each row execute function private.protect_counters();
create trigger reviews_protect before update on public.reviews
  for each row execute function private.protect_counters();

create or replace function private.authored_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  if tg_table_name = 'posts' then
    update public.user_statistics set posts_count = (select count(*) from public.posts where user_id = v_user)
    where user_id = v_user;
  else
    update public.user_statistics set reviews_count = (select count(*) from public.reviews where user_id = v_user)
    where user_id = v_user;
  end if;
  return null;
end;
$$;
create trigger posts_authored after insert or delete on public.posts
  for each row execute function private.authored_counts();
create trigger reviews_authored after insert or delete on public.reviews
  for each row execute function private.authored_counts();

-- ---------------------------------------------------------------------------
-- Unified feed. Reviews and posts stay distinct via item_type.
-- security_invoker = true so the underlying RLS policies apply.
-- ---------------------------------------------------------------------------
create view public.feed_items
with (security_invoker = true)
as
  select 'post'::text as item_type, p.id, p.user_id, p.book_id, p.kind::text as kind,
    null::numeric as rating, null::text as headline, p.body, p.has_spoilers,
    p.like_count, p.comment_count, p.created_at
  from public.posts p
  union all
  select 'review'::text, r.id, r.user_id, r.book_id, 'review'::text,
    r.rating, r.headline, r.body, r.has_spoilers,
    r.like_count, r.comment_count, r.created_at
  from public.reviews r;
