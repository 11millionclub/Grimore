-- GriMore — delete messages and conversations, delete your account, newsletter.

-- --------------------------------------------------------------- Messages
-- Deleting a conversation clears it for you only: earlier messages disappear
-- from your side, and it comes back (empty) if the other reader writes again.
alter table public.conversation_reads add column if not exists cleared_at timestamptz;

create or replace function private.conversation_cleared_at(p_conversation uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select cleared_at from public.conversation_reads where conversation_id = p_conversation and user_id = auth.uid();
$$;

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages for select to authenticated using (
  private.is_conversation_member(conversation_id)
  and created_at > coalesce(private.conversation_cleared_at(conversation_id), '-infinity'::timestamptz)
);

create or replace function public.clear_conversation(p_conversation uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.is_conversation_member(p_conversation) then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at, cleared_at)
  values (p_conversation, auth.uid(), now(), now())
  on conflict (conversation_id, user_id) do update set cleared_at = now(), last_read_at = now();
end;
$$;
revoke all on function public.clear_conversation(uuid) from public, anon;
grant execute on function public.clear_conversation(uuid) to authenticated;

create or replace function public.list_conversations()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.last_message_at desc nulls last), '[]'::jsonb)
  from (
    select c.id, c.last_message_at, c.last_message_preview,
      o.id as other_id, o.username as other_username, o.display_name as other_display_name,
      o.avatar_url as other_avatar_url,
      (select count(*) from public.messages m
        where m.conversation_id = c.id and m.sender_id <> auth.uid()
          and m.created_at > coalesce(r.last_read_at, '-infinity'))::int as unread
    from public.conversations c
    join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
    left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = auth.uid()
    where auth.uid() in (c.user_a, c.user_b) and c.last_message_at is not null
      and c.last_message_at > coalesce(r.cleared_at, '-infinity')
      and not private.is_blocked_between(c.user_a, c.user_b)
  ) x
$$;

-- When a message is deleted, the conversation's preview shows the latest one left.
create or replace function private.refresh_conversation_preview() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations c set
    last_message_at = (select max(m.created_at) from public.messages m where m.conversation_id = old.conversation_id),
    last_message_preview = (select left(m.body, 140) from public.messages m where m.conversation_id = old.conversation_id order by m.created_at desc limit 1)
  where c.id = old.conversation_id;
  return null;
end;
$$;
drop trigger if exists messages_refresh_preview on public.messages;
create trigger messages_refresh_preview after delete on public.messages
  for each row execute function private.refresh_conversation_preview();

-- --------------------------------------------------------------- Account
-- Deletes the reader's login; every row of theirs is removed by the foreign
-- keys (all cascade or are set to null). The app removes their uploaded files
-- first, from their own storage folders.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = v_user;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ------------------------------------------------------------ Newsletter
alter table public.user_preferences add column if not exists newsletter_opt_in boolean not null default false;
alter table public.user_preferences add column if not exists newsletter_updated_at timestamptz;
create or replace function private.stamp_newsletter() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.newsletter_opt_in is distinct from old.newsletter_opt_in then new.newsletter_updated_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists user_preferences_newsletter on public.user_preferences;
create trigger user_preferences_newsletter before update of newsletter_opt_in on public.user_preferences
  for each row execute function private.stamp_newsletter();

-- ------------------------------------------------------------ App themes
-- Colour themes for the whole app: four free, five paid (open while paywalls are off).
alter table public.corner_items drop constraint if exists corner_items_key_check;
alter table public.corner_items drop constraint if exists corner_items_kind_check;
alter table public.corner_items add constraint corner_items_key_check check (key ~ '^(theme|frame|shelf|name|pack|badge|icon|ribbon|laurel|card|library|apptheme):[a-z0-9-]+$');
alter table public.corner_items add constraint corner_items_kind_check check (kind in ('theme','frame','shelf','name','pack','badge','icon','ribbon','laurel','card','library','apptheme'));
insert into public.corner_items (key, kind, name, price_cents, sort_order, source) values
  ('apptheme:ivory', 'apptheme', 'Ivory', null, 1, 'shop'),
  ('apptheme:midnight', 'apptheme', 'Midnight', null, 2, 'shop'),
  ('apptheme:parchment', 'apptheme', 'Parchment', null, 3, 'shop'),
  ('apptheme:forest', 'apptheme', 'Forest', null, 4, 'shop'),
  ('apptheme:rose', 'apptheme', 'Rose Quartz', 149, 5, 'shop'),
  ('apptheme:velvet', 'apptheme', 'Burgundy Velvet', 149, 6, 'shop'),
  ('apptheme:academia', 'apptheme', 'Dark Academia', 149, 7, 'shop'),
  ('apptheme:celestial', 'apptheme', 'Celestial', 149, 8, 'shop'),
  ('apptheme:emerald', 'apptheme', 'Emerald Gilt', 149, 9, 'shop')
on conflict (key) do nothing;
insert into public.point_rewards (id, kind, title, description, cost_points, item_key, sort_order)
select 'item-' || replace(ci.key, ':', '-'), 'corner_item', ci.name || ' app theme', 'Colours for the whole app', 600, ci.key, 0
from public.corner_items ci
where ci.kind = 'apptheme' and ci.price_cents is not null
  and not exists (select 1 from public.point_rewards r where r.item_key = ci.key);

alter table public.user_preferences add column if not exists app_theme text not null default 'ivory';
create or replace function private.guard_app_theme() returns trigger
language plpgsql security definer set search_path = '' as $$
declare it public.corner_items;
begin
  select * into it from public.corner_items where key = 'apptheme:' || new.app_theme;
  if not found then raise exception 'unknown_item' using errcode = '22023'; end if;
  if private.paywalls_on() and it.price_cents is not null
     and not exists (select 1 from public.corner_purchases where user_id = new.user_id and item_key = it.key)
     and not exists (select 1 from public.user_items u where u.user_id = new.user_id and u.item_key = it.key) then
    raise exception 'item_not_owned' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists user_preferences_app_theme on public.user_preferences;
create trigger user_preferences_app_theme before insert or update of app_theme on public.user_preferences
  for each row execute function private.guard_app_theme();
