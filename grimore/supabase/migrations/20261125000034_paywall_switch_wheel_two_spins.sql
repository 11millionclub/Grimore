-- GriMore — a paywall switch for testing, and a simpler wheel.

-- ------------------------------------------------------------ Paywalls
-- One switch in app_config. Off (the testing default): every My Grimore item
-- and library room can be used without buying it, and anyone who joins a paid
-- community sees everything in it. Turn it back on before launch:
--   update public.app_config set value = 'true' where key = 'paywalls';
insert into public.app_config (key, value) values ('paywalls', 'false') on conflict (key) do nothing;

create or replace function private.paywalls_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.config('paywalls'))::boolean, true);
$$;

-- Paid community content: any member counts as paying while paywalls are off.
create or replace function private.is_community_member(p_community uuid, p_paid_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = p_community and m.user_id = auth.uid()
      and (not p_paid_only or not private.paywalls_on() or m.tier in ('circle', 'patron') or m.role in ('host', 'moderator'))
  )
$$;

create or replace function private.has_paid_access(p_user uuid, p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members m join public.communities c on c.id = m.community_id
    where m.user_id = p_user and m.community_id = p_community and c.price_cents is not null
      and (not private.paywalls_on() or m.tier in ('member', 'circle', 'patron') or c.host_id = p_user));
$$;

-- My Grimore items: paid items are usable without a purchase while paywalls are off.
create or replace function private.corners_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  it public.corner_items;
  v_house text;
  v_pay boolean := private.paywalls_on();
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
    if v_pay and it.price_cents is not null and not exists (select 1 from public.corner_purchases where user_id = new.user_id and item_key = v_key)
       and not exists (select 1 from public.user_items u where u.user_id = new.user_id and u.item_key = v_key) then
      raise exception 'item_not_owned' using errcode = '42501', hint = 'Purchases are coming soon.';
    end if;
  end loop;
  if v_pay and new.community_banner_id is not null and not private.has_paid_access(new.user_id, new.community_banner_id) then
    raise exception 'community_banner_members_only' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- Wheel
-- One spin ("SPIN") and one reroll ("SPIN AGAIN") a day.
create or replace function public.wheel_spins_left() returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, 2 - coalesce((select spins from public.wheel_spins where user_id = auth.uid() and day = (now() at time zone 'utc')::date), 0));
$$;

create or replace function public.use_wheel_spin(p_book uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_left int;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.wheel_spins (user_id) values (v_user) on conflict do nothing;
  update public.wheel_spins set spins = spins + 1, last_book = p_book
  where user_id = v_user and day = (now() at time zone 'utc')::date and spins < 2
  returning 2 - spins into v_left;
  if v_left is null then raise exception 'no_spins_left' using errcode = 'P0001'; end if;
  return v_left;
end;
$$;
revoke all on function public.wheel_spins_left(), public.use_wheel_spin(uuid) from public, anon;
grant execute on function public.wheel_spins_left(), public.use_wheel_spin(uuid) to authenticated;
