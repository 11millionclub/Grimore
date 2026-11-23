-- The upload policies compared the folder against `name`, which inside the
-- sub-query resolved to communities.name instead of the file path, so every
-- upload was refused. Qualify it as objects.name.
drop policy if exists "community hosts upload media" on storage.objects;
drop policy if exists "community hosts update media" on storage.objects;
drop policy if exists "community hosts delete media" on storage.objects;
create policy "community hosts upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'community-media' and exists (
    select 1 from public.communities c where c.id::text = (storage.foldername(objects.name))[1] and c.host_id = (select auth.uid())));
create policy "community hosts update media" on storage.objects for update to authenticated
  using (bucket_id = 'community-media' and exists (
    select 1 from public.communities c where c.id::text = (storage.foldername(objects.name))[1] and c.host_id = (select auth.uid())));
create policy "community hosts delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'community-media' and exists (
    select 1 from public.communities c where c.id::text = (storage.foldername(objects.name))[1] and c.host_id = (select auth.uid())));
-- Uploads use upsert, which also needs to read the existing object.
create policy "community media readable" on storage.objects for select to authenticated
  using (bucket_id = 'community-media');
