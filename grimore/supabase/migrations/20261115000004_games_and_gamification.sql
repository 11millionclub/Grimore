-- GriMore — 0004 Daily games, streaks, XP, achievements, scanning
--
-- Security model: clients can READ challenges (public payload only) and their
-- own progress. Every write — guesses, hints, answers, XP, streaks,
-- achievements — happens inside SECURITY DEFINER functions that validate
-- against solutions clients can never read.

create type public.game_type as enum ('bookle', 'cover_reveal', 'quiz');
create type public.challenge_status as enum ('draft', 'scheduled', 'published', 'retired');
create type public.attempt_status as enum ('in_progress', 'won', 'lost');

-- Curated, human-validated quiz bank. Never exposed to clients directly.
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('author', 'character', 'origin', 'movement', 'opening_line', 'setting', 'awards', 'general')),
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  prompt text not null unique check (char_length(prompt) between 10 and 300),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null check (char_length(explanation) between 10 and 600),
  related_book_id uuid references public.books (id) on delete set null,
  validated_at timestamptz,
  validation_note text,
  created_at timestamptz not null default now()
);
create index quiz_questions_book_idx on public.quiz_questions (related_book_id);

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  game public.game_type not null,
  challenge_date date not null,
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  status public.challenge_status not null default 'scheduled',
  -- Everything a client is allowed to see before solving. Never the answer.
  public_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (game, challenge_date)
);
create index daily_challenges_date_idx on public.daily_challenges (challenge_date, game);

create table public.daily_challenge_solutions (
  challenge_id uuid primary key references public.daily_challenges (id) on delete cascade,
  answer_book_id uuid references public.books (id) on delete restrict,
  quiz_question_id uuid references public.quiz_questions (id) on delete restrict,
  correct_index smallint check (correct_index between 0 and 3),
  explanation text,
  check (answer_book_id is not null or quiz_question_id is not null)
);
create index daily_challenge_solutions_book_idx on public.daily_challenge_solutions (answer_book_id);
create index daily_challenge_solutions_quiz_idx on public.daily_challenge_solutions (quiz_question_id);

create table public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  game public.game_type not null,
  challenge_date date not null,
  status public.attempt_status not null default 'in_progress',
  guesses_count smallint not null default 0,
  hints_used smallint not null default 0,
  score int not null default 0,
  xp_awarded int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, challenge_id)
);
create index game_attempts_user_date_idx on public.game_attempts (user_id, challenge_date desc);
create index game_attempts_challenge_idx on public.game_attempts (challenge_id);

create table public.game_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.game_attempts (id) on delete cascade,
  position smallint not null,
  guessed_book_id uuid references public.books (id) on delete set null,
  selected_index smallint,
  is_correct boolean not null default false,
  feedback jsonb,
  created_at timestamptz not null default now(),
  unique (attempt_id, position)
);
create index game_answers_book_idx on public.game_answers (guessed_book_id);

create table public.user_game_statistics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game public.game_type not null,
  played int not null default 0,
  won int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_played_date date,
  -- Bookle: {"1": n, ..., "6": n, "x": n}
  distribution jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);

create table public.user_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  completed_days int not null default 0,
  perfect_days int not null default 0,
  -- Future-ready: not granted or sold in v1.
  freezes_available smallint not null default 0 check (freezes_available between 0 and 5),
  updated_at timestamptz not null default now()
);

create table public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  games_completed smallint not null default 0,
  is_perfect boolean not null default false,
  xp_earned int not null default 0,
  primary key (user_id, activity_date)
);

create table public.achievements (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null,
  icon text not null,
  category text not null check (category in ('games', 'streak', 'reading', 'social')),
  xp_reward int not null default 0 check (xp_reward between 0 and 500),
  sort_order smallint not null default 0
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index user_achievements_achievement_idx on public.user_achievements (achievement_id);

-- Ledger. (user_id, source_type, source_key) makes every award idempotent.
create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount between -1000 and 1000),
  reason text not null,
  source_type text not null check (source_type in ('game', 'perfect_day', 'achievement', 'adjustment')),
  source_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);
create index xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);

create or replace function private.xp_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_statistics set total_xp = total_xp + new.amount, updated_at = now()
  where user_id = new.user_id;
  return null;
end;
$$;
create trigger xp_transactions_total after insert on public.xp_transactions
  for each row execute function private.xp_after_insert();

-- ---------------------------------------------------------------------------
-- Scanning (future AI-assisted bulk import)
-- ---------------------------------------------------------------------------
create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('isbn_barcode', 'shelf_photo', 'manual_list')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'review', 'completed', 'failed')),
  image_path text check (char_length(image_path) <= 512),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create trigger scan_jobs_rate_limit before insert on public.scan_jobs
  for each row execute function private.enforce_rate_limit('30', '1 hour');
create index scan_jobs_user_idx on public.scan_jobs (user_id, created_at desc);

create table public.scan_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.scan_jobs (id) on delete cascade,
  raw_text text,
  isbn text check (isbn ~ '^[0-9X]{10,13}$'),
  matched_book_id uuid references public.books (id) on delete set null,
  confidence real check (confidence between 0 and 1),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);
create index scan_candidates_job_idx on public.scan_candidates (job_id);
create index scan_candidates_book_idx on public.scan_candidates (matched_book_id);

-- ---------------------------------------------------------------------------
-- Game helpers (private)
-- ---------------------------------------------------------------------------
create or replace function private.book_card(p_book uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'cover_url', b.cover_url,
    'first_published_year', b.first_published_year,
    'authors', coalesce((
      select jsonb_agg(a.name order by ba.position)
      from public.book_authors ba join public.authors a on a.id = ba.author_id
      where ba.book_id = b.id and ba.role = 'author'
    ), '[]'::jsonb)
  )
  from public.books b where b.id = p_book
$$;

create or replace function private.page_band(p int)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case
    when p is null then null
    when p < 200 then 0
    when p < 350 then 1
    when p < 500 then 2
    when p < 700 then 3
    else 4
  end::smallint
$$;

create or replace function private.title_word_count(t text)
returns int
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(regexp_split_to_array(trim(regexp_replace(t, '[^[:alnum:]'' ]+', ' ', 'g')), '\s+'), 1), 0)
$$;

-- Deterministic Bookle feedback: every field compares the guess against the
-- target using only stored, verified metadata. Missing data yields 'unknown'
-- rather than a misleading clue.
create or replace function private.bookle_feedback(p_guess uuid, p_target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  g record;
  t record;
  v_g_decade int;
  v_t_decade int;
  v_g_band smallint;
  v_t_band smallint;
  v_g_words int;
  v_t_words int;
begin
  select b.id, b.title, b.first_published_year, b.page_count_estimate, b.primary_genre_id,
         gn.name as genre_name, a.id as author_id, a.name as author_name, a.nationality_code
    into g
  from public.books b
  left join public.genres gn on gn.id = b.primary_genre_id
  left join public.book_authors ba on ba.book_id = b.id and ba.position = 0 and ba.role = 'author'
  left join public.authors a on a.id = ba.author_id
  where b.id = p_guess;

  select b.id, b.title, b.first_published_year, b.page_count_estimate, b.primary_genre_id,
         a.id as author_id, a.nationality_code
    into t
  from public.books b
  left join public.book_authors ba on ba.book_id = b.id and ba.position = 0 and ba.role = 'author'
  left join public.authors a on a.id = ba.author_id
  where b.id = p_target;

  v_g_decade := (g.first_published_year / 10) * 10;
  v_t_decade := (t.first_published_year / 10) * 10;
  v_g_band := private.page_band(g.page_count_estimate);
  v_t_band := private.page_band(t.page_count_estimate);
  v_g_words := private.title_word_count(g.title);
  v_t_words := private.title_word_count(t.title);

  return jsonb_build_object(
    'decade', jsonb_build_object(
      'value', v_g_decade,
      'result', case
        when v_g_decade is null or v_t_decade is null then 'unknown'
        when v_g_decade = v_t_decade then 'match'
        when v_t_decade < v_g_decade then 'earlier'
        else 'later' end),
    'genre', jsonb_build_object(
      'value', g.genre_name,
      'result', case
        when g.primary_genre_id is null or t.primary_genre_id is null then 'unknown'
        when g.primary_genre_id = t.primary_genre_id then 'match'
        when exists (select 1 from public.book_genres bg where bg.book_id = t.id and bg.genre_id = g.primary_genre_id)
          then 'partial'
        else 'miss' end),
    'nationality', jsonb_build_object(
      'value', g.nationality_code,
      'result', case
        when g.nationality_code is null or t.nationality_code is null then 'unknown'
        when g.nationality_code = t.nationality_code then 'match'
        else 'miss' end),
    'title_words', jsonb_build_object(
      'value', v_g_words,
      'result', case
        when v_g_words = v_t_words then 'match'
        when v_t_words > v_g_words then 'more'
        else 'fewer' end),
    'length', jsonb_build_object(
      'value', v_g_band,
      'result', case
        when v_g_band is null or v_t_band is null then 'unknown'
        when v_g_band = v_t_band then 'match'
        when v_t_band > v_g_band then 'longer'
        else 'shorter' end),
    'author', jsonb_build_object(
      'value', g.author_name,
      'result', case
        when g.author_id is null or t.author_id is null then 'unknown'
        when g.author_id = t.author_id then 'match'
        else 'miss' end)
  );
end;
$$;

create or replace function private.author_initials(p_book uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(left(part, 1) || '.', ' ')
  from public.book_authors ba
  join public.authors a on a.id = ba.author_id
  cross join lateral regexp_split_to_table(a.name, '\s+') with ordinality as s(part, n)
  where ba.book_id = p_book and ba.position = 0 and ba.role = 'author' and part ~ '^[[:alpha:]]'
$$;

create or replace function private.award_achievement(p_user uuid, p_achievement text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted int;
  v_xp int;
begin
  insert into public.user_achievements (user_id, achievement_id)
  values (p_user, p_achievement)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;

  select xp_reward into v_xp from public.achievements where id = p_achievement;
  if coalesce(v_xp, 0) > 0 then
    insert into public.xp_transactions (user_id, amount, reason, source_type, source_key)
    values (p_user, v_xp, 'Achievement: ' || p_achievement, 'achievement', p_achievement)
    on conflict do nothing;
  end if;
  insert into public.notifications (recipient_id, type, achievement_id)
  values (p_user, 'achievement', p_achievement);
  return true;
end;
$$;

-- Called once when an attempt reaches a final state.
create or replace function private.finish_attempt(p_attempt uuid, p_status public.attempt_status, p_score int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.game_attempts;
  v_xp int;
  v_day public.daily_activity;
  v_streak public.user_streaks;
  v_stats public.user_game_statistics;
  v_new_streak int;
  v_dist_key text;
  v_inserted int;
begin
  update public.game_attempts
     set status = p_status, score = p_score, completed_at = now()
   where id = p_attempt and status = 'in_progress'
  returning * into a;
  if a.id is null then return; end if;

  v_xp := case a.game when 'quiz' then 10 when 'bookle' then 15 when 'cover_reveal' then 15 end;
  insert into public.xp_transactions (user_id, amount, reason, source_type, source_key)
  values (a.user_id, v_xp, 'Completed ' || a.game::text, 'game', a.challenge_id::text)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.game_attempts set xp_awarded = v_xp where id = a.id;
  else
    v_xp := 0;
  end if;

  -- Daily activity
  insert into public.daily_activity as d (user_id, activity_date, games_completed, xp_earned)
  values (a.user_id, a.challenge_date, 1, v_xp)
  on conflict (user_id, activity_date) do update
    set games_completed = d.games_completed + 1, xp_earned = d.xp_earned + excluded.xp_earned
  returning * into v_day;

  -- Global streak: first completion of the day extends or restarts it.
  insert into public.user_streaks (user_id) values (a.user_id) on conflict do nothing;
  select * into v_streak from public.user_streaks where user_id = a.user_id for update;
  if v_day.games_completed = 1 then
    v_new_streak := case
      when v_streak.last_active_date = a.challenge_date - 1 then v_streak.current_streak + 1
      when v_streak.last_active_date = a.challenge_date then v_streak.current_streak
      else 1 end;
    update public.user_streaks set
      current_streak = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      last_active_date = a.challenge_date,
      completed_days = completed_days + 1,
      updated_at = now()
    where user_id = a.user_id
    returning * into v_streak;
  end if;

  -- Perfect Day: all three games completed.
  if v_day.games_completed >= 3 and not v_day.is_perfect then
    update public.daily_activity set is_perfect = true
     where user_id = a.user_id and activity_date = a.challenge_date;
    insert into public.xp_transactions (user_id, amount, reason, source_type, source_key)
    values (a.user_id, 15, 'Perfect Day', 'perfect_day', a.challenge_date::text)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      update public.daily_activity set xp_earned = xp_earned + 15
       where user_id = a.user_id and activity_date = a.challenge_date;
      update public.user_streaks set perfect_days = perfect_days + 1 where user_id = a.user_id
      returning * into v_streak;
    end if;
    perform private.award_achievement(a.user_id, 'perfect_day');
  end if;

  -- Per-game statistics and streak.
  insert into public.user_game_statistics (user_id, game) values (a.user_id, a.game) on conflict do nothing;
  select * into v_stats from public.user_game_statistics where user_id = a.user_id and game = a.game for update;
  v_new_streak := case
    when v_stats.last_played_date = a.challenge_date - 1 then v_stats.current_streak + 1
    when v_stats.last_played_date = a.challenge_date then v_stats.current_streak
    else 1 end;
  v_dist_key := case when p_status = 'won' then greatest(a.guesses_count, 1)::text else 'x' end;
  update public.user_game_statistics set
    played = played + 1,
    won = won + case when p_status = 'won' then 1 else 0 end,
    current_streak = v_new_streak,
    longest_streak = greatest(longest_streak, v_new_streak),
    last_played_date = a.challenge_date,
    distribution = jsonb_set(distribution, array[v_dist_key],
      to_jsonb(coalesce((distribution ->> v_dist_key)::int, 0) + 1)),
    updated_at = now()
  where user_id = a.user_id and game = a.game
  returning * into v_stats;

  -- Achievements
  perform private.award_achievement(a.user_id, 'first_day');
  if v_streak.current_streak >= 3 then perform private.award_achievement(a.user_id, 'streak_3'); end if;
  if v_streak.current_streak >= 7 then perform private.award_achievement(a.user_id, 'streak_7'); end if;
  if v_streak.current_streak >= 30 then perform private.award_achievement(a.user_id, 'streak_30'); end if;
  if a.game = 'bookle' and p_status = 'won' and a.guesses_count <= 3 then
    perform private.award_achievement(a.user_id, 'book_detective');
  end if;
  if a.game = 'cover_reveal' and p_status = 'won' and a.hints_used = 0 then
    perform private.award_achievement(a.user_id, 'cover_expert');
  end if;
  if a.game = 'quiz' and v_stats.won >= 10 then
    perform private.award_achievement(a.user_id, 'literary_mind');
  end if;
end;
$$;

-- Fetch (or start) the caller's attempt for one of today's challenges.
create or replace function private.open_attempt(p_challenge uuid, p_expected public.game_type)
returns public.game_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.daily_challenges;
  a public.game_attempts;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into c from public.daily_challenges where id = p_challenge;
  if c.id is null or c.game <> p_expected or c.status <> 'published' then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  if c.challenge_date <> public.utc_today() then
    raise exception 'challenge_not_today' using errcode = 'P0001',
      hint = 'Only today''s challenge can be played.';
  end if;

  insert into public.game_attempts (user_id, challenge_id, game, challenge_date)
  values (auth.uid(), c.id, c.game, c.challenge_date)
  on conflict (user_id, challenge_id) do nothing;

  select * into a from public.game_attempts
   where user_id = auth.uid() and challenge_id = c.id
   for update;
  return a;
end;
$$;

-- Full client-facing state for one challenge. Solutions only once finished.
create or replace function private.challenge_state(p_challenge uuid, p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.daily_challenges;
  a public.game_attempts;
  s public.daily_challenge_solutions;
  v_answers jsonb;
  v_solution jsonb := null;
  v_clues jsonb := '{}'::jsonb;
begin
  select * into c from public.daily_challenges where id = p_challenge;
  if c.id is null then return null; end if;
  select * into a from public.game_attempts where challenge_id = c.id and user_id = p_user;
  select * into s from public.daily_challenge_solutions where challenge_id = c.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'position', ga.position,
      'is_correct', ga.is_correct,
      'selected_index', ga.selected_index,
      'feedback', ga.feedback,
      'book', case when ga.guessed_book_id is not null then private.book_card(ga.guessed_book_id) end
    ) order by ga.position), '[]'::jsonb)
    into v_answers
  from public.game_answers ga where ga.attempt_id = a.id;

  if c.game = 'bookle' and a.id is not null and a.guesses_count >= 3 then
    v_clues := jsonb_build_object('author_initials', private.author_initials(s.answer_book_id));
  end if;

  if a.status in ('won', 'lost') then
    v_solution := jsonb_build_object(
      'book', case when s.answer_book_id is not null then private.book_card(s.answer_book_id) end,
      'correct_index', s.correct_index,
      'explanation', s.explanation
    );
  end if;

  return jsonb_build_object(
    'id', c.id,
    'game', c.game,
    'challenge_date', c.challenge_date,
    'difficulty', c.difficulty,
    'payload', c.public_payload,
    'attempt', case when a.id is null then null else jsonb_build_object(
      'status', a.status,
      'guesses_count', a.guesses_count,
      'hints_used', a.hints_used,
      'score', a.score,
      'xp_awarded', a.xp_awarded,
      'completed_at', a.completed_at
    ) end,
    'answers', v_answers,
    'clues', v_clues,
    'solution', v_solution
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public game API
-- ---------------------------------------------------------------------------
create or replace function public.get_today_challenges()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return coalesce((
    select jsonb_agg(private.challenge_state(c.id, v_uid) order by
      case c.game when 'bookle' then 1 when 'cover_reveal' then 2 else 3 end)
    from public.daily_challenges c
    where c.challenge_date = public.utc_today() and c.status = 'published'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_challenge_state(p_challenge uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.daily_challenges
    where id = p_challenge and status = 'published' and challenge_date <= public.utc_today()
  ) then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  return private.challenge_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.bookle_guess(p_challenge uuid, p_book uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.game_attempts;
  v_target uuid;
  v_correct boolean;
  v_position smallint;
begin
  a := private.open_attempt(p_challenge, 'bookle');
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished' using errcode = 'P0001';
  end if;
  if a.guesses_count >= 6 then
    raise exception 'no_guesses_left' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.books where id = p_book) then
    raise exception 'book_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.game_answers where attempt_id = a.id and guessed_book_id = p_book) then
    raise exception 'already_guessed' using errcode = 'P0001';
  end if;

  select answer_book_id into v_target from public.daily_challenge_solutions where challenge_id = p_challenge;
  v_correct := p_book = v_target;
  v_position := a.guesses_count + 1;

  insert into public.game_answers (attempt_id, position, guessed_book_id, is_correct, feedback)
  values (a.id, v_position, p_book, v_correct, private.bookle_feedback(p_book, v_target));
  update public.game_attempts set guesses_count = v_position where id = a.id;

  if v_correct then
    perform private.finish_attempt(a.id, 'won', (7 - v_position) * 100 / 6);
  elsif v_position >= 6 then
    perform private.finish_attempt(a.id, 'lost', 0);
  end if;

  return private.challenge_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.cover_reveal_hint(p_challenge uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.game_attempts;
begin
  a := private.open_attempt(p_challenge, 'cover_reveal');
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished' using errcode = 'P0001';
  end if;
  if a.hints_used >= 3 then
    raise exception 'no_hints_left' using errcode = 'P0001';
  end if;
  update public.game_attempts set hints_used = hints_used + 1 where id = a.id;
  return private.challenge_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.cover_reveal_answer(p_challenge uuid, p_book uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.game_attempts;
  v_target uuid;
  v_correct boolean;
  v_options jsonb;
begin
  a := private.open_attempt(p_challenge, 'cover_reveal');
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished' using errcode = 'P0001';
  end if;
  select public_payload -> 'options' into v_options from public.daily_challenges where id = p_challenge;
  if not exists (select 1 from jsonb_array_elements(v_options) o where (o ->> 'id')::uuid = p_book) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;

  select answer_book_id into v_target from public.daily_challenge_solutions where challenge_id = p_challenge;
  v_correct := p_book = v_target;
  insert into public.game_answers (attempt_id, position, guessed_book_id, is_correct)
  values (a.id, 1, p_book, v_correct);
  update public.game_attempts set guesses_count = 1 where id = a.id;
  perform private.finish_attempt(a.id,
    case when v_correct then 'won'::public.attempt_status else 'lost'::public.attempt_status end,
    case when v_correct then 100 - a.hints_used * 25 else 0 end);
  return private.challenge_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.quiz_answer(p_challenge uuid, p_index smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.game_attempts;
  v_correct_index smallint;
  v_correct boolean;
begin
  if p_index is null or p_index not between 0 and 3 then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  a := private.open_attempt(p_challenge, 'quiz');
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished' using errcode = 'P0001';
  end if;
  select correct_index into v_correct_index from public.daily_challenge_solutions where challenge_id = p_challenge;
  v_correct := p_index = v_correct_index;
  insert into public.game_answers (attempt_id, position, selected_index, is_correct)
  values (a.id, 1, p_index, v_correct);
  update public.game_attempts set guesses_count = 1 where id = a.id;
  perform private.finish_attempt(a.id,
    case when v_correct then 'won'::public.attempt_status else 'lost'::public.attempt_status end,
    case when v_correct then 100 else 0 end);
  return private.challenge_state(p_challenge, auth.uid());
end;
$$;

-- Progress summary with the *effective* streak (0 once a day was missed).
create or replace function public.get_progress(p_user uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  s public.user_streaks;
  v_today date := public.utc_today();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not private.can_view_user(v_user) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into s from public.user_streaks where user_id = v_user;
  return jsonb_build_object(
    'current_streak', case when s.last_active_date >= v_today - 1 then s.current_streak else 0 end,
    'longest_streak', coalesce(s.longest_streak, 0),
    'completed_days', coalesce(s.completed_days, 0),
    'perfect_days', coalesce(s.perfect_days, 0),
    'played_today', coalesce(s.last_active_date = v_today, false),
    'total_xp', coalesce((select total_xp from public.user_statistics where user_id = v_user), 0),
    'calendar', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.activity_date, 'games', d.games_completed, 'perfect', d.is_perfect)
        order by d.activity_date)
      from public.daily_activity d
      where d.user_id = v_user and d.activity_date > v_today - 84
    ), '[]'::jsonb),
    'games', coalesce((
      select jsonb_object_agg(g.game, jsonb_build_object(
        'played', g.played, 'won', g.won,
        'current_streak', case when g.last_played_date >= v_today - 1 then g.current_streak else 0 end,
        'longest_streak', g.longest_streak, 'distribution', g.distribution))
      from public.user_game_statistics g where g.user_id = v_user
    ), '{}'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduling: fills future days from the validated pools. Idempotent.
-- Answers are reused only once every eligible answer has been used, picking
-- the least recently used first.
-- ---------------------------------------------------------------------------
create or replace function private.schedule_challenges(p_from date, p_days int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
  v_created int := 0;
  v_book uuid;
  v_question public.quiz_questions;
  v_challenge uuid;
  v_options jsonb;
begin
  for v_day in select generate_series(p_from, p_from + p_days - 1, interval '1 day')::date loop
    -- Bookle: curated works with complete clue metadata.
    if not exists (select 1 from public.daily_challenges where game = 'bookle' and challenge_date = v_day) then
      select b.id into v_book
      from public.books b
      join public.book_authors ba on ba.book_id = b.id and ba.position = 0
      join public.authors au on au.id = ba.author_id
      where b.is_curated and b.first_published_year is not null and b.page_count_estimate is not null
        and b.primary_genre_id is not null and au.nationality_code is not null
      order by (
        select max(dc.challenge_date) from public.daily_challenge_solutions s
        join public.daily_challenges dc on dc.id = s.challenge_id
        where s.answer_book_id = b.id and dc.game = 'bookle'
      ) nulls first, md5(b.id::text || 'bookle')
      limit 1;
      if v_book is not null then
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('bookle', v_day, 2, 'published', jsonb_build_object('max_guesses', 6))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, answer_book_id) values (v_challenge, v_book);
        v_created := v_created + 1;
      end if;
    end if;

    -- Cover Reveal: curated works with a verified cover, plus three distractors.
    if not exists (select 1 from public.daily_challenges where game = 'cover_reveal' and challenge_date = v_day) then
      select b.id into v_book
      from public.books b
      where b.is_curated and b.cover_url is not null
      order by (
        select max(dc.challenge_date) from public.daily_challenge_solutions s
        join public.daily_challenges dc on dc.id = s.challenge_id
        where s.answer_book_id = b.id and dc.game = 'cover_reveal'
      ) nulls first, md5(b.id::text || 'cover')
      limit 1;
      if v_book is not null then
        select jsonb_agg(private.book_card(x.id) - 'cover_url' order by md5(x.id::text || v_day::text))
          into v_options
        from (
          select v_book as id
          union all
          select d.id from (
            select b2.id from public.books b2
            where b2.is_curated and b2.id <> v_book
            order by (b2.primary_genre_id is not distinct from
                       (select primary_genre_id from public.books where id = v_book)) desc,
                     md5(b2.id::text || v_day::text)
            limit 3
          ) d
        ) x;
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('cover_reveal', v_day, 2, 'published', jsonb_build_object(
          'cover_url', (select cover_url from public.books where id = v_book),
          'max_hints', 3,
          'reveal_seed', abs(hashtext(v_day::text || 'cover')),
          'options', v_options))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, answer_book_id) values (v_challenge, v_book);
        v_created := v_created + 1;
      end if;
    end if;

    -- Literary Quiz: only validated questions.
    if not exists (select 1 from public.daily_challenges where game = 'quiz' and challenge_date = v_day) then
      select q.* into v_question
      from public.quiz_questions q
      where q.validated_at is not null
      order by (
        select max(dc.challenge_date) from public.daily_challenge_solutions s
        join public.daily_challenges dc on dc.id = s.challenge_id
        where s.quiz_question_id = q.id
      ) nulls first, md5(q.id::text || 'quiz')
      limit 1;
      if v_question.id is not null then
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('quiz', v_day, v_question.difficulty, 'published', jsonb_build_object(
          'prompt', v_question.prompt,
          'options', v_question.options,
          'category', v_question.category))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, quiz_question_id, correct_index, explanation, answer_book_id)
        values (v_challenge, v_question.id, v_question.correct_index, v_question.explanation, v_question.related_book_id);
        v_created := v_created + 1;
      end if;
    end if;
  end loop;
  return v_created;
end;
$$;
revoke all on function private.schedule_challenges(date, int) from public, anon, authenticated;
