-- Personal points wallet. Every point a reader earns for their House (daily
-- games) also counts towards their own balance. Spending only takes from the
-- personal balance: the House Cup ledger is never touched.
alter table public.user_items drop constraint if exists user_items_source_check;
alter table public.user_items add constraint user_items_source_check check (source in ('earned', 'paid', 'points'));

create table public.point_rewards (
  id text primary key check (id ~ '^[a-z0-9-]{3,60}$'),
  kind text not null check (kind in ('corner_item', 'shop_discount')),
  title text not null,
  description text,
  cost_points int not null check (cost_points > 0),
  item_key text references public.corner_items(key) on delete cascade,
  discount_percent int check (discount_percent between 1 and 100),
  active boolean not null default true,
  sort_order int not null default 0,
  check ((kind = 'corner_item' and item_key is not null) or (kind = 'shop_discount' and discount_percent is not null))
);
alter table public.point_rewards enable row level security;
create policy "rewards are public" on public.point_rewards for select using (active);

create table public.point_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id text not null references public.point_rewards(id),
  points int not null check (points > 0),
  code text unique,
  created_at timestamptz not null default now()
);
create index point_redemptions_user_idx on public.point_redemptions (user_id, created_at desc);
alter table public.point_redemptions enable row level security;
create policy "own redemptions" on public.point_redemptions for select using (user_id = (select auth.uid()));

create or replace function public.my_wallet() returns table (earned bigint, spent bigint, balance bigint)
language sql stable security definer set search_path = '' as $$
  with e as (select coalesce(sum(points), 0)::bigint as n from public.house_points where user_id = auth.uid()),
       s as (select coalesce(sum(points), 0)::bigint as n from public.point_redemptions where user_id = auth.uid())
  select e.n, s.n, e.n - s.n from e, s;
$$;

create or replace function public.redeem_reward(p_reward text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  r public.point_rewards;
  v_balance bigint;
  v_code text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- One redemption at a time per reader, so the balance cannot be spent twice.
  perform pg_advisory_xact_lock(hashtext('wallet:' || v_user::text));
  select * into r from public.point_rewards where id = p_reward and active;
  if not found then raise exception 'reward_not_found' using errcode = 'P0002'; end if;
  select balance into v_balance from public.my_wallet();
  if v_balance < r.cost_points then raise exception 'not_enough_points' using errcode = 'P0001'; end if;
  if r.kind = 'corner_item' then
    if exists (select 1 from public.user_items where user_id = v_user and item_key = r.item_key)
       or exists (select 1 from public.corner_purchases where user_id = v_user and item_key = r.item_key) then
      raise exception 'already_owned' using errcode = 'P0001';
    end if;
    insert into public.user_items (user_id, item_key, source, season_id) values (v_user, r.item_key, 'points', private.current_season());
  else
    v_code := 'GRIM-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  end if;
  insert into public.point_redemptions (user_id, reward_id, points, code) values (v_user, r.id, r.cost_points, v_code);
  return jsonb_build_object('reward', r.id, 'code', v_code, 'balance', v_balance - r.cost_points);
end;
$$;

revoke all on function public.my_wallet(), public.redeem_reward(text) from public, anon;
grant execute on function public.my_wallet(), public.redeem_reward(text) to authenticated;

-- Catalogue: every paid My Grimore item can also be had for points
-- (about 3 points per cent of price), plus shop discount vouchers.
insert into public.point_rewards (id, kind, title, description, cost_points, item_key, sort_order)
select 'item-' || replace(replace(i.key, ':', '-'), '_', '-'), 'corner_item', i.name, 'For My Grimore', greatest(300, i.price_cents * 3), i.key, i.sort_order
from public.corner_items i
where i.price_cents is not null
on conflict (id) do nothing;
insert into public.point_rewards (id, kind, title, description, cost_points, discount_percent, sort_order) values
  ('shop-10', 'shop_discount', '10% off in the Grimore shop', 'A one-time code for the Grimore shop.', 500, 10, 1),
  ('shop-20', 'shop_discount', '20% off in the Grimore shop', 'A one-time code for the Grimore shop.', 900, 20, 2),
  ('shop-30', 'shop_discount', '30% off in the Grimore shop', 'A one-time code for the Grimore shop.', 1300, 30, 3)
on conflict (id) do nothing;
