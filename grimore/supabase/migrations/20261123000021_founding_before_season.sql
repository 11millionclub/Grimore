-- Readers sorted before Season 1 starts are founding members too.
create or replace function private.grant_founding() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.reason = 'initial' and (new.season_id is null or new.season_id = (select min(id) from public.house_seasons)) then
    insert into public.user_items (user_id, item_key, source, season_id)
    values (new.user_id, 'badge:founding', 'earned', (select min(id) from public.house_seasons))
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger house_changes_founding after insert on public.house_changes
  for each row execute function private.grant_founding();
