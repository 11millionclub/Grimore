-- GriMore — 0009 The Nook (customisable reader profile)
--
-- Replaces "My Corner" appearance settings with Nook settings:
--   * nook_scene       one of the illustrated libraries, or 'custom'
--   * nook_background  public URL of a reader-uploaded background (own photo)
--   * nook_seal        wax-seal colour used for the reader's accents
--   * nook_frame       portrait frame shape
--   * nook_shelf       shelf wood
--   * nook_title       a short epithet shown under the name ("Keeper of the Night Shelf")
-- Featured book, quotes and favourite authors keep their existing tables.

alter table public.user_preferences
  add column if not exists nook_scene text not null default 'great-hall'
    check (nook_scene in ('great-hall', 'candlelit-study', 'wizard-tower', 'dragon-archive', 'elven-library', 'moonlit-reading-room', 'custom')),
  add column if not exists nook_background_url text
    check (nook_background_url is null or nook_background_url ~ '^https://'),
  add column if not exists nook_seal text not null default 'wine'
    check (nook_seal in ('wine', 'emerald', 'sapphire', 'amethyst', 'gilt', 'obsidian')),
  add column if not exists nook_frame text not null default 'arch'
    check (nook_frame in ('arch', 'circle', 'shield')),
  add column if not exists nook_shelf text not null default 'oak'
    check (nook_shelf in ('oak', 'walnut', 'ebony', 'birch')),
  add column if not exists nook_title text
    check (char_length(nook_title) <= 48);

-- A custom scene requires an uploaded background.
alter table public.user_preferences
  add constraint user_preferences_custom_scene_has_image
  check (nook_scene <> 'custom' or nook_background_url is not null);

-- Public read of the Nook's appearance, with the same visibility rule as the profile.
create or replace function public.get_nook_settings(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'scene', p.nook_scene,
    'background_url', p.nook_background_url,
    'seal', p.nook_seal,
    'frame', p.nook_frame,
    'shelf', p.nook_shelf,
    'title', p.nook_title,
    'featured_book_id', p.corner_featured_book_id
  )
  from public.user_preferences p
  where p.user_id = p_user and private.can_view_user(p_user)
$$;
revoke execute on function public.get_nook_settings(uuid) from public, anon;
grant execute on function public.get_nook_settings(uuid) to authenticated;

-- Reader-uploaded Nook backgrounds: public read, owner-only writes under <uid>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nook-backgrounds', 'nook-backgrounds', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "nook background owners upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'nook-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "nook background owners update" on storage.objects
  for update to authenticated
  using (bucket_id = 'nook-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'nook-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "nook background owners delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'nook-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
