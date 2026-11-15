-- GriMore — security & game-integrity verification
--
-- Runs entirely inside a transaction that is rolled back: it creates two
-- throwaway users, impersonates them through the `authenticated` role with
-- JWT claims (exactly how PostgREST runs client requests), asserts the RLS
-- and RPC rules, and leaves no trace.
--
-- Run in the Supabase SQL editor or with:
--   psql "$DATABASE_URL" -f supabase/tests/security_verification.sql
-- Any failed assertion aborts with "ASSERTION FAILED: ...".

begin;

create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.act_as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function pg_temp.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'ASSERTION FAILED: %', p_label; end if;
  raise notice 'ok  %', p_label;
end $$;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  v_book uuid;
  v_other_book uuid;
  v_quiz uuid;
  v_bookle uuid;
  v_correct smallint;
  v_count int;
  v_xp int;
  v_post uuid;
  v_state jsonb;
  v_failed boolean;
begin
  -- Fixtures (as admin)
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a-' || a || '@test.invalid', '{"username":"rls_test_a","display_name":"Reader A"}', now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b-' || b || '@test.invalid', '{"username":"rls_test_b","display_name":"Reader B"}', now(), now());
  perform pg_temp.check((select count(*) from public.profiles where id in (a, b)) = 2, 'signup trigger creates profiles');
  perform pg_temp.check((select username::text from public.profiles where id = a) = 'rls_test_a', 'requested username is honoured');

  select id into v_book from public.books where is_curated order by title limit 1;
  select id into v_other_book from public.books where is_curated order by title offset 1 limit 1;
  select c.id, s.correct_index into v_quiz, v_correct
    from public.daily_challenges c join public.daily_challenge_solutions s on s.challenge_id = c.id
   where c.game = 'quiz' and c.challenge_date = public.utc_today();
  select c.id into v_bookle from public.daily_challenges c where c.game = 'bookle' and c.challenge_date = public.utc_today();

  -- ---------------------------------------------------------------- library
  perform pg_temp.act_as(a);
  insert into public.user_books (user_id, book_id, status) values (a, v_book, 'reading');
  perform pg_temp.check((select count(*) from public.user_books where user_id = a) = 1, 'user can add to own library');

  v_failed := false;
  begin
    insert into public.user_books (user_id, book_id, status) values (b, v_book, 'read');
  exception when insufficient_privilege or check_violation then v_failed := true;
  end;
  perform pg_temp.check(v_failed, 'user cannot write into another user''s library');

  update public.user_books set status = 'read' where user_id = a and book_id = v_book;
  perform pg_temp.check((select books_read from public.user_statistics where user_id = a) = 1, 'statistics trigger counts finished books');

  -- ------------------------------------------------------- protected tables
  update public.user_statistics set total_xp = 99999 where user_id = a;
  perform pg_temp.check((select total_xp from public.user_statistics where user_id = a) = 0, 'user cannot edit own XP total');

  v_failed := false;
  begin
    insert into public.xp_transactions (user_id, amount, reason, source_type, source_key) values (a, 500, 'cheat', 'adjustment', 'x');
  exception when insufficient_privilege then v_failed := true;
  end;
  perform pg_temp.check(v_failed, 'user cannot mint XP transactions');

  v_failed := false;
  begin
    insert into public.game_attempts (user_id, challenge_id, game, challenge_date, status, score)
    values (a, v_quiz, 'quiz', public.utc_today(), 'won', 100);
  exception when insufficient_privilege then v_failed := true;
  end;
  perform pg_temp.check(v_failed, 'user cannot fabricate game attempts');

  update public.user_streaks set current_streak = 365 where user_id = a;
  perform pg_temp.check(coalesce((select current_streak from public.user_streaks where user_id = a), 0) = 0, 'user cannot edit own streak');

  perform pg_temp.check((select count(*) from public.daily_challenge_solutions) = 0, 'solutions are invisible to clients');
  perform pg_temp.check((select count(*) from public.quiz_questions) = 0, 'quiz bank is invisible to clients');
  perform pg_temp.check(
    (select count(*) from public.daily_challenges where challenge_date > public.utc_today()) = 0,
    'future challenges are not readable');

  -- ------------------------------------------------------------ quiz flow
  v_state := public.quiz_answer(v_quiz, v_correct);
  perform pg_temp.check(v_state -> 'attempt' ->> 'status' = 'won', 'correct quiz answer wins');
  perform pg_temp.check((v_state -> 'attempt' ->> 'xp_awarded')::int = 10, 'quiz awards 10 XP');
  perform pg_temp.check(v_state -> 'solution' ->> 'explanation' is not null, 'explanation revealed after answering');

  v_failed := false;
  begin
    perform public.quiz_answer(v_quiz, ((v_correct + 1) % 4)::smallint);
  exception when others then v_failed := sqlerrm = 'attempt_finished';
  end;
  perform pg_temp.check(v_failed, 'quiz can only be answered once per day');

  select count(*) into v_count from public.xp_transactions where user_id = a and source_type = 'game';
  perform pg_temp.check(v_count = 1, 'no duplicate game XP');
  select total_xp into v_xp from public.user_statistics where user_id = a;
  perform pg_temp.check(v_xp = 20, 'XP total = quiz 10 + First Day achievement 10');
  perform pg_temp.check((public.get_progress() ->> 'current_streak')::int = 1, 'first completed day starts a streak');
  perform pg_temp.check(exists (select 1 from public.user_achievements where user_id = a and achievement_id = 'first_day'), 'First Day achievement awarded');

  -- ---------------------------------------------------------- bookle flow
  v_state := public.bookle_guess(v_bookle, v_book);
  perform pg_temp.check(jsonb_array_length(v_state -> 'answers') = 1, 'bookle guess recorded');
  perform pg_temp.check(v_state -> 'answers' -> 0 -> 'feedback' ? 'decade', 'bookle guess returns feedback');
  perform pg_temp.check(v_state -> 'solution' = 'null'::jsonb or v_state -> 'answers' -> 0 ->> 'is_correct' = 'true', 'answer hidden while in progress');
  v_failed := false;
  begin
    perform public.bookle_guess(v_bookle, v_book);
  exception when others then v_failed := sqlerrm in ('already_guessed', 'attempt_finished');
  end;
  perform pg_temp.check(v_failed, 'same book cannot be guessed twice');

  -- ------------------------------------------------- social & privacy
  perform pg_temp.act_as(b);
  update public.profiles set is_private = true where id = b;
  insert into public.posts (user_id, kind, body) values (b, 'thought', 'A private thought') returning id into v_post;

  perform pg_temp.act_as(a);
  perform pg_temp.check((select count(*) from public.posts where id = v_post) = 0, 'private account posts hidden from non-followers');
  update public.profiles set bio = 'hacked' where id = b;
  perform pg_temp.act_as_admin();
  perform pg_temp.check((select bio from public.profiles where id = b) is null, 'user cannot edit another profile');

  perform pg_temp.act_as(a);
  insert into public.follows (follower_id, followee_id) values (a, b);
  perform pg_temp.check((select status::text from public.follows where follower_id = a and followee_id = b) = 'pending', 'following a private account creates a request');
  update public.follows set status = 'accepted' where follower_id = a and followee_id = b;
  perform pg_temp.check((select status::text from public.follows where follower_id = a and followee_id = b) = 'pending', 'requester cannot self-accept');

  perform pg_temp.act_as(b);
  update public.follows set status = 'accepted' where follower_id = a and followee_id = b;
  perform pg_temp.act_as(a);
  perform pg_temp.check((select count(*) from public.posts where id = v_post) = 1, 'accepted follower sees private posts');

  insert into public.post_reactions (post_id, user_id) values (v_post, a);
  perform pg_temp.check((select like_count from public.posts where id = v_post) = 1, 'like counter maintained by trigger');

  v_failed := false;
  begin
    update public.posts set like_count = 1000 where id = v_post;
  exception when insufficient_privilege then v_failed := true;
  end;
  perform pg_temp.check(v_failed, 'counters cannot be edited by clients');

  perform pg_temp.act_as(b);
  perform pg_temp.check((select count(*) from public.notifications where recipient_id = b and type = 'post_like') = 1, 'like creates a notification for the author');
  insert into public.user_blocks (blocker_id, blocked_id) values (b, a);

  perform pg_temp.act_as(a);
  perform pg_temp.check((select count(*) from public.posts where id = v_post) = 0, 'blocked users lose visibility');
  perform pg_temp.check((select count(*) from public.follows where follower_id = a and followee_id = b) = 0, 'blocking removes follows');

  -- --------------------------------------------------------------- anon
  perform pg_temp.act_as_admin();
  execute 'set local role anon';
  v_failed := false;
  begin
    perform count(*) from public.books;
  exception when insufficient_privilege then v_failed := true;
  end;
  perform pg_temp.check(v_failed, 'anonymous clients cannot read tables');
  execute 'reset role';

  raise notice 'ALL SECURITY CHECKS PASSED';
end $$;

rollback;
