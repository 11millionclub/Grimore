-- Paid communities get an uploaded logo and banner. Paying members can wear
-- the banner on their Corner while their subscription is active; it is
-- removed automatically when the membership ends or drops to visitor.
alter table public.communities
  add column if not exists logo_url text check (logo_url is null or (logo_url ~ '^https://' and char_length(logo_url) <= 500)),
  add column if not exists banner_url text check (banner_url is null or (banner_url ~ '^https://' and char_length(banner_url) <= 500));
grant update (logo_url, banner_url) on public.communities to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Files live under <community id>/...; only that community's host can write them.
create policy "community hosts upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'community-media' and exists (
    select 1 from public.communities c where c.id::text = (storage.foldername(name))[1] and c.host_id = (select auth.uid())));
create policy "community hosts update media" on storage.objects for update to authenticated
  using (bucket_id = 'community-media' and exists (
    select 1 from public.communities c where c.id::text = (storage.foldername(name))[1] and c.host_id = (select auth.uid())));
create policy "community hosts delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'community-media' and exists (
    select 1 from public.communities c where c.id::text = (storage.foldername(name))[1] and c.host_id = (select auth.uid())));

create or replace function private.has_paid_access(p_user uuid, p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members m join public.communities c on c.id = m.community_id
    where m.user_id = p_user and m.community_id = p_community and c.price_cents is not null
      and (m.tier in ('member', 'circle', 'patron') or c.host_id = p_user));
$$;

alter table public.corners add column if not exists community_banner_id uuid references public.communities(id) on delete set null;

create or replace function private.corners_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  it public.corner_items;
  v_house text;
begin
  select house_id into v_house from public.profiles where id = new.user_id;
  foreach v_key in array array['theme:' || new.theme, 'frame:' || new.frame, 'shelf:' || new.shelf,
                               'name:' || new.name_style, 'pack:' || new.pack]
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

-- Membership ends or drops to visitor: take the banner off the Corner.
create or replace function private.drop_lapsed_banner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' or not private.has_paid_access(new.user_id, new.community_id) then
    update public.corners set community_banner_id = null
     where user_id = old.user_id and community_banner_id = old.community_id;
  end if;
  return null;
end;
$$;
create trigger community_members_banner after delete or update of tier on public.community_members
  for each row execute function private.drop_lapsed_banner();
