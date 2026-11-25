-- GriMore — private (invite-only) and anonymous communities.
--
-- Private: hidden from everyone but its members; you join only with an
-- invite code from the host (free or paid).
-- Anonymous: nobody sees who wrote a discussion or a reply (each writer gets a
-- stable alias per community), but posts can still be reported and the host
-- can still remove them. Authors are hidden by the server, not by the app.

alter table public.communities add column if not exists is_private boolean not null default false;
alter table public.communities add column if not exists is_anonymous boolean not null default false;
grant insert (is_private, is_anonymous), update (is_private, is_anonymous) on public.communities to authenticated;

-- Secret per community, so aliases cannot be worked out from user ids.
create table if not exists private.community_salts (
  community_id uuid primary key references public.communities(id) on delete cascade,
  salt text not null default (gen_random_uuid()::text || gen_random_uuid()::text)
);

-- ------------------------------------------------------------------ helpers
create or replace function private.can_see_community(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.communities c
    where c.id = p_community
      and (not c.is_private or c.host_id = auth.uid()
           or exists (select 1 from public.community_members m where m.community_id = c.id and m.user_id = auth.uid()))
  )
$$;

create or replace function private.community_is_anonymous(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_anonymous from public.communities where id = p_community), false)
$$;

create or replace function private.is_community_host(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = p_community and m.user_id = auth.uid() and m.role in ('host', 'moderator')
  )
$$;

create or replace function private.thread_community(p_thread uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select community_id from public.community_threads where id = p_thread
$$;

insert into private.community_salts (community_id) select id from public.communities on conflict do nothing;
create or replace function private.community_salt_on_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.community_salts (community_id) values (new.id) on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists communities_salt on public.communities;
create trigger communities_salt after insert on public.communities
  for each row execute function private.community_salt_on_insert();

create or replace function private.community_alias(p_community uuid, p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select 'Reader ' || upper(substr(md5(coalesce((select salt from private.community_salts where community_id = p_community), p_community::text) || p_user::text), 1, 4))
$$;

-- Anonymity can be switched on at any time, but never off once someone has
-- posted: that would reveal who wrote what.
create or replace function private.guard_anonymous() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_anonymous and not new.is_anonymous
     and exists (select 1 from public.community_threads where community_id = old.id) then
    raise exception 'anonymous_locked' using errcode = '42501', hint = 'An anonymous community with posts stays anonymous.';
  end if;
  return new;
end;
$$;
drop trigger if exists communities_guard_anonymous on public.communities;
create trigger communities_guard_anonymous before update of is_anonymous on public.communities
  for each row execute function private.guard_anonymous();

-- Helpers used by row policies run for signed-in readers; the alias function
-- is only ever called inside server functions (it would let anyone match
-- aliases to people).
revoke all on function private.can_see_community(uuid), private.community_is_anonymous(uuid), private.is_community_host(uuid),
  private.thread_community(uuid) from public, anon;
grant execute on function private.can_see_community(uuid), private.community_is_anonymous(uuid), private.is_community_host(uuid),
  private.thread_community(uuid) to authenticated;
revoke all on function private.community_alias(uuid, uuid) from public, anon, authenticated;
revoke all on function private.community_salt_on_insert(), private.guard_anonymous() from public, anon, authenticated;
revoke all on private.community_salts from public, anon, authenticated;

-- ----------------------------------------------------------------- policies
drop policy if exists "communities are discoverable" on public.communities;
create policy "communities are discoverable" on public.communities for select using (
  not is_private or host_id = (select auth.uid()) or private.is_community_member(id)
);

drop policy if exists "members are visible" on public.community_members;
create policy "members are visible" on public.community_members for select using (
  private.can_see_community(community_id)
  and (user_id = (select auth.uid()) or not private.community_is_anonymous(community_id) or private.is_community_host(community_id))
);

-- Private communities are joined only through an invite (join_community_by_invite).
drop policy if exists "users join for free" on public.community_members;
create policy "users join for free" on public.community_members for insert with check (
  user_id = (select auth.uid()) and role = 'member'
  and not coalesce((select c.is_private from public.communities c where c.id = community_members.community_id), true)
  and tier = case when (select c.price_cents from public.communities c where c.id = community_members.community_id) is null then 'member' else 'visitor' end
  and coalesce((select (c.max_members is null) or (c.member_count < c.max_members) from public.communities c where c.id = community_members.community_id), false)
);

drop policy if exists "threads visible to members (paid ones to paid tiers)" on public.community_threads;
create policy "threads visible to members (paid ones to paid tiers)" on public.community_threads for select using (
  not private.is_blocked_between(user_id, (select auth.uid()))
  and case when members_only then private.is_community_member(community_id, true) else true end
  and private.can_see_community(community_id)
  -- In anonymous communities others' posts are read through community_feed / community_thread.
  and (not private.community_is_anonymous(community_id) or user_id = (select auth.uid()))
);

drop policy if exists "replies visible with their thread" on public.community_replies;
create policy "replies visible with their thread" on public.community_replies for select using (
  not private.is_blocked_between(user_id, (select auth.uid()))
  and exists (select 1 from public.community_threads t where t.id = community_replies.thread_id)
  and (not private.community_is_anonymous(private.thread_community(thread_id)) or user_id = (select auth.uid()))
);

drop policy if exists "events visible" on public.community_events;
create policy "events visible" on public.community_events for select using (private.can_see_community(community_id));

-- ------------------------------------------------------------- anonymous reads
-- Discussions of an anonymous community with aliases instead of names.
create or replace function public.community_feed(p_community uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'community_id', t.community_id, 'title', t.title, 'body', t.body, 'book_id', t.book_id,
      'has_spoilers', t.has_spoilers, 'members_only', t.members_only, 'is_pinned', t.is_pinned,
      'reply_count', t.reply_count, 'created_at', t.created_at, 'updated_at', t.updated_at,
      'mine', t.user_id = auth.uid(),
      'alias', case when m.role in ('host', 'moderator') then 'Host' else private.community_alias(t.community_id, t.user_id) end)
    order by t.is_pinned desc, t.created_at desc), '[]'::jsonb)
  from public.community_threads t
  left join public.community_members m on m.community_id = t.community_id and m.user_id = t.user_id
  where t.community_id = p_community
    and private.can_see_community(p_community)
    and (not t.members_only or private.is_community_member(p_community, true))
    and not private.is_blocked_between(t.user_id, auth.uid())
$$;

create or replace function public.community_thread(p_thread uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with t as (
    select t.* from public.community_threads t
    where t.id = p_thread and private.can_see_community(t.community_id)
      and (not t.members_only or private.is_community_member(t.community_id, true))
  )
  select case when not exists (select 1 from t) then null else jsonb_build_object(
    'thread', (select jsonb_build_object(
        'id', t.id, 'community_id', t.community_id, 'title', t.title, 'body', t.body, 'book_id', t.book_id,
        'has_spoilers', t.has_spoilers, 'members_only', t.members_only, 'is_pinned', t.is_pinned,
        'reply_count', t.reply_count, 'created_at', t.created_at, 'updated_at', t.updated_at,
        'mine', t.user_id = auth.uid(),
        'alias', case when exists (select 1 from public.community_members m where m.community_id = t.community_id and m.user_id = t.user_id and m.role in ('host', 'moderator'))
                      then 'Host' else private.community_alias(t.community_id, t.user_id) end) from t),
    'replies', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'thread_id', r.thread_id, 'body', r.body, 'has_spoilers', r.has_spoilers, 'created_at', r.created_at,
        'mine', r.user_id = auth.uid(),
        'alias', case when m.role in ('host', 'moderator') then 'Host' else private.community_alias(t.community_id, r.user_id) end)
      order by r.created_at)
      from t join public.community_replies r on r.thread_id = t.id
      left join public.community_members m on m.community_id = t.community_id and m.user_id = r.user_id
      where not private.is_blocked_between(r.user_id, auth.uid())), '[]'::jsonb)) end
$$;

-- The host (or a moderator) removes a discussion or reply without seeing who wrote it.
create or replace function public.community_remove_post(p_kind text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_community uuid;
begin
  if p_kind = 'thread' then
    select community_id into v_community from public.community_threads where id = p_id;
  elsif p_kind = 'reply' then
    select t.community_id into v_community from public.community_replies r join public.community_threads t on t.id = r.thread_id where r.id = p_id;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if v_community is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not private.is_community_host(v_community) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_kind = 'thread' then delete from public.community_threads where id = p_id;
  else delete from public.community_replies where id = p_id; end if;
end;
$$;

revoke all on function public.community_feed(uuid), public.community_thread(uuid), public.community_remove_post(text, uuid) from public, anon;
grant execute on function public.community_feed(uuid), public.community_thread(uuid), public.community_remove_post(text, uuid) to authenticated;

-- Reports of anonymous posts reach moderators with the author filled in by the server.
create or replace function private.fill_report_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.reported_user_id is null then
    if new.community_thread_id is not null then
      select user_id into new.reported_user_id from public.community_threads where id = new.community_thread_id;
    elsif new.community_reply_id is not null then
      select user_id into new.reported_user_id from public.community_replies where id = new.community_reply_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists content_reports_fill_author on public.content_reports;
create trigger content_reports_fill_author before insert on public.content_reports
  for each row execute function private.fill_report_author();

-- Notifications from anonymous communities carry no actor.
create or replace function private.community_counters() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_thread public.community_threads;
  v_anon boolean;
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
    if tg_op = 'INSERT' and v_thread.id is not null then
      v_anon := private.community_is_anonymous(v_thread.community_id);
      if v_anon then
        if v_thread.user_id <> new.user_id then
          insert into public.notifications (recipient_id, actor_id, type, data)
          values (v_thread.user_id, null, 'community', jsonb_build_object('community_id', v_thread.community_id, 'thread_id', v_id, 'event', 'reply', 'anonymous', true));
        end if;
      else
        perform private.notify_data(v_thread.user_id, new.user_id, 'community',
          jsonb_build_object('community_id', v_thread.community_id, 'thread_id', v_id, 'event', 'reply'));
      end if;
    end if;
  elsif tg_table_name = 'community_threads' and tg_op = 'INSERT' then
    v_anon := private.community_is_anonymous(new.community_id);
    insert into public.notifications (recipient_id, actor_id, type, data)
    select m.user_id, case when v_anon then null else new.user_id end, 'community',
      jsonb_build_object('community_id', new.community_id, 'thread_id', new.id, 'event', 'thread') || case when v_anon then '{"anonymous": true}'::jsonb else '{}'::jsonb end
    from public.community_members m
    where m.community_id = new.community_id and m.role in ('host', 'moderator') and m.user_id <> new.user_id
      and (v_anon or not private.is_blocked_between(m.user_id, new.user_id));
  end if;
  return null;
end;
$$;

-- Suggestions never include private communities you are not in.
create or replace function public.suggest_communities(p_limit integer default 20)
returns table(id uuid, match integer)
language sql stable security definer set search_path = '' as $$
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
    where not c.is_private
  )
  select s.id,
    least(99, 55 + least(s.shared_books, 20) * 2 + case when s.genre_hit then 12 else 0 end
              + least(s.member_count, 50) / 10)::int as match
  from scored s
  order by match desc, s.member_count desc
  limit greatest(1, least(p_limit, 50))
$$;

-- ------------------------------------------------------------------ invites
create table if not exists public.community_invites (
  code text primary key default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  max_uses int check (max_uses is null or max_uses between 1 and 1000),
  uses int not null default 0,
  revoked_at timestamptz
);
create index if not exists community_invites_community on public.community_invites (community_id);
alter table public.community_invites enable row level security;
revoke all on public.community_invites from anon, authenticated;
grant select on public.community_invites to authenticated;
drop policy if exists "hosts see invites" on public.community_invites;
create policy "hosts see invites" on public.community_invites for select using (private.is_community_host(community_id));

create or replace function public.create_community_invite(p_community uuid, p_max_uses int default null, p_days int default 30)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.is_community_host(p_community) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if (select count(*) from public.community_invites where community_id = p_community and created_at > now() - interval '1 day') >= 50 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.community_invites (community_id, created_by, max_uses, expires_at)
  values (p_community, auth.uid(), p_max_uses, now() + make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))))
  returning code into v_code;
  return v_code;
end;
$$;

create or replace function public.revoke_community_invite(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.community_invites set revoked_at = now()
  where code = upper(p_code) and private.is_community_host(community_id);
end;
$$;

-- What an invite opens, so the invitee can decide before joining.
create or replace function public.community_invite_preview(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'community_id', c.id, 'name', c.name, 'tagline', c.tagline, 'cover_scene', c.cover_scene,
    'logo_url', c.logo_url, 'banner_url', c.banner_url, 'price_cents', c.price_cents,
    'member_count', c.member_count, 'is_private', c.is_private, 'is_anonymous', c.is_anonymous,
    'host', (select jsonb_build_object('username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url) from public.profiles p where p.id = c.host_id),
    'already_member', exists (select 1 from public.community_members m where m.community_id = c.id and m.user_id = auth.uid()))
  from public.community_invites i join public.communities c on c.id = i.community_id
  where i.code = upper(trim(p_code)) and i.revoked_at is null and i.expires_at > now()
    and (i.max_uses is null or i.uses < i.max_uses) and auth.uid() is not null
$$;

create or replace function public.join_community_by_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i public.community_invites;
  c public.communities;
  v_rows int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into i from public.community_invites where code = upper(trim(p_code)) for update;
  if i.code is null or i.revoked_at is not null or i.expires_at <= now() or (i.max_uses is not null and i.uses >= i.max_uses) then
    raise exception 'invite_invalid' using errcode = 'P0002', hint = 'This invite has expired or is no longer valid.';
  end if;
  select * into c from public.communities where id = i.community_id;
  if exists (select 1 from public.community_members where community_id = c.id and user_id = auth.uid()) then return c.id; end if;
  if c.max_members is not null and c.member_count >= c.max_members then
    raise exception 'community_full' using errcode = 'P0001', hint = 'This community is full.';
  end if;
  insert into public.community_members (community_id, user_id, role, tier)
  values (c.id, auth.uid(), 'member', case when c.price_cents is null then 'member' else 'visitor' end)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then update public.community_invites set uses = uses + 1 where code = i.code; end if;
  return c.id;
end;
$$;

revoke all on function public.create_community_invite(uuid, int, int), public.revoke_community_invite(text),
  public.community_invite_preview(text), public.join_community_by_invite(text) from public, anon;
grant execute on function public.create_community_invite(uuid, int, int), public.revoke_community_invite(text),
  public.community_invite_preview(text), public.join_community_by_invite(text) to authenticated;

-- Replying checks membership through the thread's community (in anonymous
-- communities the thread row itself is not visible to other members).
drop policy if exists "members reply" on public.community_replies;
create policy "members reply" on public.community_replies for insert with check (
  user_id = (select auth.uid()) and private.is_community_member(private.thread_community(thread_id))
);

-- You can always read your own replies (needed to show them right after posting).
drop policy if exists "replies visible with their thread" on public.community_replies;
create policy "replies visible with their thread" on public.community_replies for select using (
  not private.is_blocked_between(user_id, (select auth.uid()))
  and (user_id = (select auth.uid())
       or (exists (select 1 from public.community_threads t where t.id = community_replies.thread_id)
           and not private.community_is_anonymous(private.thread_community(thread_id))))
);
