-- GriMore — profile pictures are illustrated avatars only, stored as a short
-- code ("avatar:v1:" + 8 part numbers) and drawn by the app. No photo uploads.
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^avatar:v1:[0-9]{1,2}(\.[0-9]{1,2}){7}$');

-- The avatars bucket takes no new photos (owners can still delete old files).
drop policy if exists "avatar owners upload" on storage.objects;
drop policy if exists "avatar owners update" on storage.objects;
