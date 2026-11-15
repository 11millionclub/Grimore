-- GriMore — 0005 Row Level Security
--
-- Principles
--  * RLS is enabled on every table in public.
--  * Users write only rows they own; ownership is checked against auth.uid().
--  * Derived/sensitive tables (statistics, streaks, XP, achievements, game
--    attempts, solutions) have NO client write policies: they change only via
--    SECURITY DEFINER functions.
--  * The anonymous role reads nothing: every policy targets `authenticated`.

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_view_user(uuid) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;

revoke execute on function public.upsert_book(jsonb) from public, anon;
revoke execute on function public.search_catalogue(text, int) from public, anon;
revoke execute on function public.get_today_challenges() from public, anon;
revoke execute on function public.get_challenge_state(uuid) from public, anon;
revoke execute on function public.bookle_guess(uuid, uuid) from public, anon;
revoke execute on function public.cover_reveal_hint(uuid) from public, anon;
revoke execute on function public.cover_reveal_answer(uuid, uuid) from public, anon;
revoke execute on function public.quiz_answer(uuid, smallint) from public, anon;
revoke execute on function public.get_progress(uuid) from public, anon;
grant execute on function public.upsert_book(jsonb) to authenticated;
grant execute on function public.search_catalogue(text, int) to authenticated;
grant execute on function public.get_today_challenges() to authenticated;
grant execute on function public.get_challenge_state(uuid) to authenticated;
grant execute on function public.bookle_guess(uuid, uuid) to authenticated;
grant execute on function public.cover_reveal_hint(uuid) to authenticated;
grant execute on function public.cover_reveal_answer(uuid, uuid) to authenticated;
grant execute on function public.quiz_answer(uuid, smallint) to authenticated;
grant execute on function public.get_progress(uuid) to authenticated;
-- Username availability is checked during sign-up, before a session exists.
grant execute on function public.is_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles & user-level
-- ---------------------------------------------------------------------------
create policy "profiles are readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "users update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "users read their own preferences" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users update their own preferences" on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "statistics follow profile visibility" on public.user_statistics
  for select to authenticated using (private.can_view_user(user_id));

create policy "genres are public" on public.genres for select to authenticated using (true);

create policy "favorite genres readable" on public.user_favorite_genres
  for select to authenticated using (private.can_view_user(user_id));
create policy "users add their favorite genres" on public.user_favorite_genres
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users remove their favorite genres" on public.user_favorite_genres
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catalogue: read-only for clients (writes via public.upsert_book)
-- ---------------------------------------------------------------------------
create policy "authors are public" on public.authors for select to authenticated using (true);
create policy "books are public" on public.books for select to authenticated using (true);
create policy "book authors are public" on public.book_authors for select to authenticated using (true);
create policy "book genres are public" on public.book_genres for select to authenticated using (true);
create policy "editions are public" on public.book_editions for select to authenticated using (true);
create policy "identifiers are public" on public.book_identifiers for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Library
-- ---------------------------------------------------------------------------
create policy "library entries visible to owner or permitted viewers" on public.user_books
  for select to authenticated
  using (user_id = (select auth.uid()) or (not is_private and private.can_view_user(user_id)));
create policy "users add to their own library" on public.user_books
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update their own library" on public.user_books
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users remove from their own library" on public.user_books
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "own reading sessions" on public.reading_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = (select auth.uid()))
  );

create policy "reading goals visible with profile" on public.reading_goals
  for select to authenticated using (private.can_view_user(user_id));
create policy "users insert own goals" on public.reading_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own goals" on public.reading_goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own goals" on public.reading_goals
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "lists visible to owner or when public" on public.reading_lists
  for select to authenticated
  using (user_id = (select auth.uid()) or (is_public and private.can_view_user(user_id)));
create policy "users insert own lists" on public.reading_lists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own lists" on public.reading_lists
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own lists" on public.reading_lists
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "list books follow list visibility" on public.reading_list_books
  for select to authenticated
  using (exists (
    select 1 from public.reading_lists l where l.id = list_id
      and (l.user_id = (select auth.uid()) or (l.is_public and private.can_view_user(l.user_id)))
  ));
create policy "owners manage list books" on public.reading_list_books
  for insert to authenticated
  with check (exists (select 1 from public.reading_lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy "owners update list books" on public.reading_list_books
  for update to authenticated
  using (exists (select 1 from public.reading_lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.reading_lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy "owners remove list books" on public.reading_list_books
  for delete to authenticated
  using (exists (select 1 from public.reading_lists l where l.id = list_id and l.user_id = (select auth.uid())));

create policy "favorite books visible with profile" on public.user_favorite_books
  for select to authenticated using (private.can_view_user(user_id));
create policy "users add favorite books" on public.user_favorite_books
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update favorite books" on public.user_favorite_books
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users remove favorite books" on public.user_favorite_books
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "favorite authors visible with profile" on public.user_favorite_authors
  for select to authenticated using (private.can_view_user(user_id));
create policy "users add favorite authors" on public.user_favorite_authors
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users remove favorite authors" on public.user_favorite_authors
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "quotes visible with profile" on public.user_quotes
  for select to authenticated using (private.can_view_user(user_id));
create policy "users add quotes" on public.user_quotes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update quotes" on public.user_quotes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete quotes" on public.user_quotes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------
create policy "follows visible to participants and for public profiles" on public.follows
  for select to authenticated
  using (
    follower_id = (select auth.uid()) or followee_id = (select auth.uid())
    or (status = 'accepted' and private.can_view_user(followee_id) and private.can_view_user(follower_id))
  );
create policy "users follow as themselves" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "followee accepts requests" on public.follows
  for update to authenticated
  using (followee_id = (select auth.uid())) with check (followee_id = (select auth.uid()));
create policy "either side can end a follow" on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy "users see their own blocks" on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "users block as themselves" on public.user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "users unblock" on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create policy "posts visible to permitted viewers" on public.posts
  for select to authenticated using (private.can_view_user(user_id));
create policy "users publish as themselves" on public.posts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "authors edit posts" on public.posts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors delete posts" on public.posts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "comments visible with their post" on public.post_comments
  for select to authenticated
  using (
    private.can_view_user(user_id)
    and exists (select 1 from public.posts p where p.id = post_id and private.can_view_user(p.user_id))
  );
create policy "users comment as themselves on visible posts" on public.post_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id and private.can_view_user(p.user_id))
  );
create policy "authors edit comments" on public.post_comments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors or post owners delete comments" on public.post_comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );

create policy "reactions visible with post" on public.post_reactions
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and private.can_view_user(p.user_id)));
create policy "users react as themselves" on public.post_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id and private.can_view_user(p.user_id))
  );
create policy "users remove their reactions" on public.post_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "reviews visible to permitted viewers" on public.reviews
  for select to authenticated using (private.can_view_user(user_id));
create policy "users review as themselves" on public.reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "authors edit reviews" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors delete reviews" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "review comments visible with review" on public.review_comments
  for select to authenticated
  using (
    private.can_view_user(user_id)
    and exists (select 1 from public.reviews r where r.id = review_id and private.can_view_user(r.user_id))
  );
create policy "users comment on visible reviews" on public.review_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reviews r where r.id = review_id and private.can_view_user(r.user_id))
  );
create policy "authors edit review comments" on public.review_comments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors or review owners delete review comments" on public.review_comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.reviews r where r.id = review_id and r.user_id = (select auth.uid()))
  );

create policy "review reactions visible with review" on public.review_reactions
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and private.can_view_user(r.user_id)));
create policy "users react to visible reviews" on public.review_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reviews r where r.id = review_id and private.can_view_user(r.user_id))
  );
create policy "users remove review reactions" on public.review_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "users see their saved items" on public.saved_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users save items" on public.saved_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users unsave items" on public.saved_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "recipients read notifications" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy "recipients mark notifications read" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "recipients delete notifications" on public.notifications
  for delete to authenticated using (recipient_id = (select auth.uid()));

create policy "reporters see their reports" on public.content_reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy "users file reports as themselves" on public.content_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

-- ---------------------------------------------------------------------------
-- Games & gamification (read-only to clients)
-- ---------------------------------------------------------------------------
create policy "published challenges up to today" on public.daily_challenges
  for select to authenticated
  using (status = 'published' and challenge_date <= public.utc_today());
-- daily_challenge_solutions and quiz_questions: RLS on, no policies => no client access.

create policy "users read their attempts" on public.game_attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users read their answers" on public.game_answers
  for select to authenticated
  using (exists (select 1 from public.game_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

create policy "game stats follow profile visibility" on public.user_game_statistics
  for select to authenticated using (private.can_view_user(user_id));
create policy "streaks follow profile visibility" on public.user_streaks
  for select to authenticated using (private.can_view_user(user_id));
create policy "users read their daily activity" on public.daily_activity
  for select to authenticated using (user_id = (select auth.uid()));
create policy "achievement catalogue is public" on public.achievements
  for select to authenticated using (true);
create policy "earned achievements follow profile visibility" on public.user_achievements
  for select to authenticated using (private.can_view_user(user_id));
create policy "users read their xp ledger" on public.xp_transactions
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Scanning
-- ---------------------------------------------------------------------------
create policy "users read their scan jobs" on public.scan_jobs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users create scan jobs" on public.scan_jobs
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy "users delete scan jobs" on public.scan_jobs
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "users read their scan candidates" on public.scan_candidates
  for select to authenticated
  using (exists (select 1 from public.scan_jobs j where j.id = job_id and j.user_id = (select auth.uid())));
create policy "users review their scan candidates" on public.scan_candidates
  for update to authenticated
  using (exists (select 1 from public.scan_jobs j where j.id = job_id and j.user_id = (select auth.uid())))
  with check (exists (select 1 from public.scan_jobs j where j.id = job_id and j.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Column-level hardening: users may not change protected profile columns or
-- move their own library rows between users.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_url, country_code, is_private, onboarding_completed_at)
  on public.profiles to authenticated;

revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke update on public.scan_candidates from authenticated;
grant update (status) on public.scan_candidates to authenticated;

revoke update on public.posts from authenticated;
grant update (kind, body, book_id, has_spoilers) on public.posts to authenticated;

revoke update on public.reviews from authenticated;
grant update (rating, headline, body, has_spoilers) on public.reviews to authenticated;

-- Anonymous visitors get nothing beyond what policies grant (none).
revoke all on all tables in schema public from anon;
grant select on public.feed_items to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: avatars (public read, owner-only writes under <uid>/...)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatar owners upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar owners update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar owners delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
