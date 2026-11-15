-- GriMore — 0008 Public read access to My Corner appearance
--
-- user_preferences stays owner-only (it also holds private settings). This
-- function exposes just the corner appearance, and only to viewers who may
-- see the profile (same rule as the rest of the profile's content).

create or replace function public.get_corner_settings(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'layout', p.corner_layout,
    'theme', p.corner_theme,
    'arrangement', p.corner_book_arrangement,
    'featured_book_id', p.corner_featured_book_id
  )
  from public.user_preferences p
  where p.user_id = p_user and private.can_view_user(p_user)
$$;

revoke execute on function public.get_corner_settings(uuid) from public, anon;
grant execute on function public.get_corner_settings(uuid) to authenticated;
