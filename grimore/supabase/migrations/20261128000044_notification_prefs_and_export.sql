-- GriMore — notification switches that actually work, and "Export my data".

-- ------------------------------------------------------------ notifications
-- The switches in Settings (user_preferences.notification_settings) were
-- saved but never read. A notification whose category the recipient turned
-- off is now simply not created. Follow requests and achievements always
-- arrive (they need an action or are the reader's own news).
create or replace function private.notification_allowed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_settings jsonb;
  v_key text;
begin
  v_key := case new.type::text
    when 'follow' then 'follows'
    when 'follow_accepted' then 'follows'
    when 'post_like' then 'comments'
    when 'review_like' then 'comments'
    when 'post_comment' then 'comments'
    when 'review_comment' then 'comments'
    when 'comment_reply' then 'comments'
    when 'community' then 'communities'
    when 'game' then 'games'
    else null end;
  if v_key is null then return new; end if;
  select notification_settings into v_settings from public.user_preferences where user_id = new.recipient_id;
  if coalesce((v_settings ->> v_key)::boolean, true) = false then return null; end if;
  return new;
end;
$$;
drop trigger if exists notifications_respect_settings on public.notifications;
create trigger notifications_respect_settings before insert on public.notifications
  for each row execute function private.notification_allowed();
revoke all on function private.notification_allowed() from public, anon, authenticated;

-- ------------------------------------------------------------------- export
-- Everything a reader has put into Grimore, as one JSON document. Only the
-- reader's own rows; never other readers' private data.
create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_out jsonb := '{}'::jsonb;
  v_rows jsonb;
  t record;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- At most 5 exports an hour per reader (it reads a lot).
  perform pg_advisory_xact_lock(hashtext('edge:export_my_data:' || v_user::text));
  if (select count(*) from public.edge_calls where user_id = v_user and fn = 'export_my_data' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.edge_calls (user_id, fn) values (v_user, 'export_my_data');
  for t in select * from (values
    ('profile', 'profiles', 'id'), ('private_details', 'profile_private', 'user_id'), ('preferences', 'user_preferences', 'user_id'),
    ('library', 'user_books', 'user_id'), ('reading_goals', 'reading_goals', 'user_id'), ('reading_sessions', 'reading_sessions', 'user_id'),
    ('focus_sessions', 'focus_sessions', 'user_id'), ('reading_lists', 'reading_lists', 'user_id'), ('quotes', 'user_quotes', 'user_id'),
    ('favourite_books', 'user_favorite_books', 'user_id'), ('favourite_authors', 'user_favorite_authors', 'user_id'), ('favourite_genres', 'user_favorite_genres', 'user_id'),
    ('reviews', 'reviews', 'user_id'), ('review_comments', 'review_comments', 'user_id'), ('review_reactions', 'review_reactions', 'user_id'),
    ('posts', 'posts', 'user_id'), ('post_comments', 'post_comments', 'user_id'), ('post_reactions', 'post_reactions', 'user_id'),
    ('saved', 'saved_items', 'user_id'), ('following', 'follows', 'follower_id'), ('blocked', 'user_blocks', 'blocker_id'),
    ('messages_sent', 'messages', 'sender_id'), ('communities_hosted', 'communities', 'host_id'), ('community_memberships', 'community_members', 'user_id'),
    ('community_threads', 'community_threads', 'user_id'), ('community_replies', 'community_replies', 'user_id'),
    ('guestbook_written', 'corner_guestbook', 'author_id'), ('my_grimore', 'corners', 'user_id'), ('items', 'user_items', 'user_id'),
    ('purchases', 'corner_purchases', 'user_id'), ('point_grants', 'point_grants', 'user_id'), ('point_redemptions', 'point_redemptions', 'user_id'),
    ('house_points', 'house_points', 'user_id'), ('house_changes', 'house_changes', 'user_id'), ('sorting_results', 'sorting_results', 'user_id'),
    ('house_rituals', 'house_ritual_entries', 'user_id'), ('games_played', 'game_attempts', 'user_id'), ('achievements', 'user_achievements', 'user_id'),
    ('streaks', 'user_streaks', 'user_id'), ('wheel_spins', 'wheel_spins', 'user_id'), ('reports_filed', 'content_reports', 'reporter_id'),
    ('notifications', 'notifications', 'recipient_id'), ('invite_codes', 'invite_codes', 'user_id'), ('shelf_scans', 'scan_jobs', 'user_id')
  ) as x(label, tbl, col) loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from public.%I r where r.%I = $1', t.tbl, t.col) into v_rows using v_user;
    v_out := v_out || jsonb_build_object(t.label, v_rows);
  end loop;
  return jsonb_build_object('app', 'Grimore', 'exported_at', now(), 'user_id', v_user, 'data', v_out);
end;
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
