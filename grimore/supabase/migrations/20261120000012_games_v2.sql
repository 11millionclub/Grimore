-- GriMore — 0012 Daily games v2
--
-- Four time-based daily games replace Bookle / Cover Reveal / Quiz (their
-- history is kept; future v1 days are retired):
--   hangman   guess the title letter by letter; 6 candles; one letter hint
--   cover     the cover sharpens with each miss; 6 options; 4 errors
--   clues     five clues, one at a time; wrong guesses reveal the next
--   timeline  order five books by publication year; correct ones lock
-- Time is measured by the server (start -> finish) plus 10 s per miss or hint.
-- Leaderboards rank the reader against the people they follow.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
alter table public.game_attempts
  add column if not exists state jsonb not null default '{}'::jsonb,
  add column if not exists penalty_seconds int not null default 0 check (penalty_seconds >= 0),
  add column if not exists time_seconds int check (time_seconds >= 0);
create index if not exists game_attempts_challenge_time_idx on public.game_attempts (challenge_id, status, time_seconds);

alter table public.daily_challenge_solutions add column if not exists answer jsonb;
alter table public.daily_challenge_solutions drop constraint if exists daily_challenge_solutions_check;
alter table public.daily_challenge_solutions
  add constraint daily_challenge_solutions_has_answer
  check (num_nonnulls(answer_book_id, quiz_question_id, answer) >= 1);

-- Hand-written, checked clue sets for the Clues game (server-only).
create table public.clue_sets (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.books (id) on delete cascade,
  clues text[] not null check (cardinality(clues) = 5),
  validated_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.clue_sets enable row level security;
revoke all on public.clue_sets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.fold(t text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select upper(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

create or replace function private.is_v2_game(g public.game_type)
returns boolean language sql immutable set search_path = '' as $$
  select g::text in ('hangman', 'cover', 'clues', 'timeline')
$$;

-- Title with unguessed letters replaced by '_'. Spaces and punctuation show.
create or replace function private.hangman_mask(p_title text, p_guessed text[], p_reveal boolean default false)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_out text := '';
  v_c text;
  v_f text;
begin
  foreach v_c in array regexp_split_to_array(p_title, '') loop
    v_f := private.fold(v_c);
    if v_f ~ '^[A-Z]+$' and not p_reveal
       and exists (select 1 from regexp_split_to_table(v_f, '') x where not (x = any (coalesce(p_guessed, '{}')))) then
      v_out := v_out || '_';
    else
      v_out := v_out || v_c;
    end if;
  end loop;
  return v_out;
end;
$$;

create or replace function private.hangman_letters(p_title text)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct l), '{}') from regexp_split_to_table(private.fold(p_title), '') l where l ~ '^[A-Z]$'
$$;

create or replace function private.card_no_cover(p_book uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.book_card(p_book) - 'cover_url'
$$;

-- ---------------------------------------------------------------------------
-- Finishing an attempt (shared by v1 and v2)
-- ---------------------------------------------------------------------------
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
  v_needed int;
begin
  update public.game_attempts
     set status = p_status, score = p_score, completed_at = now()
   where id = p_attempt and status = 'in_progress'
  returning * into a;
  if a.id is null then return; end if;

  v_xp := case when a.game = 'quiz' then 10 else 15 end;
  insert into public.xp_transactions (user_id, amount, reason, source_type, source_key)
  values (a.user_id, v_xp, 'Completed ' || a.game::text, 'game', a.challenge_id::text)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.game_attempts set xp_awarded = v_xp where id = a.id;
  else
    v_xp := 0;
  end if;

  insert into public.daily_activity as d (user_id, activity_date, games_completed, xp_earned)
  values (a.user_id, a.challenge_date, 1, v_xp)
  on conflict (user_id, activity_date) do update
    set games_completed = d.games_completed + 1, xp_earned = d.xp_earned + excluded.xp_earned
  returning * into v_day;

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

  -- Perfect Day: every game of the day finished (4 in v2, 3 before).
  select count(*) into v_needed from public.daily_challenges
  where challenge_date = a.challenge_date and status = 'published' and private.is_v2_game(game);
  if v_needed = 0 then v_needed := 3; end if;
  if v_day.games_completed >= v_needed and not v_day.is_perfect then
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

  insert into public.user_game_statistics (user_id, game) values (a.user_id, a.game) on conflict do nothing;
  select * into v_stats from public.user_game_statistics where user_id = a.user_id and game = a.game for update;
  v_new_streak := case
    when v_stats.last_played_date = a.challenge_date - 1 then v_stats.current_streak + 1
    when v_stats.last_played_date = a.challenge_date then v_stats.current_streak
    else 1 end;
  v_dist_key := case
    when p_status <> 'won' then 'x'
    when private.is_v2_game(a.game) then (a.guesses_count + 1)::text
    else greatest(a.guesses_count, 1)::text end;
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

  perform private.award_achievement(a.user_id, 'first_day');
  if v_streak.current_streak >= 3 then perform private.award_achievement(a.user_id, 'streak_3'); end if;
  if v_streak.current_streak >= 7 then perform private.award_achievement(a.user_id, 'streak_7'); end if;
  if v_streak.current_streak >= 30 then perform private.award_achievement(a.user_id, 'streak_30'); end if;
  if p_status = 'won' then
    if a.game = 'bookle' and a.guesses_count <= 3 then perform private.award_achievement(a.user_id, 'book_detective'); end if;
    if a.game = 'cover_reveal' and a.hints_used = 0 then perform private.award_achievement(a.user_id, 'cover_expert'); end if;
    if a.game = 'quiz' and v_stats.won >= 10 then perform private.award_achievement(a.user_id, 'literary_mind'); end if;
    if a.game = 'hangman' and a.guesses_count = 0 then perform private.award_achievement(a.user_id, 'flawless_hangman'); end if;
    if a.game = 'cover' and a.guesses_count = 0 and a.hints_used = 0 then perform private.award_achievement(a.user_id, 'first_glance'); end if;
    if a.game = 'clues' and a.guesses_count = 0 and a.hints_used = 0 then perform private.award_achievement(a.user_id, 'one_clue'); end if;
    if a.game = 'timeline' and a.guesses_count = 0 then perform private.award_achievement(a.user_id, 'time_keeper'); end if;
    if private.is_v2_game(a.game) and a.time_seconds is not null and a.time_seconds < 30 then
      perform private.award_achievement(a.user_id, 'speed_reader');
    end if;
  end if;
end;
$$;

create or replace function private.finish_v2(p_attempt uuid, p_status public.attempt_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_time int;
begin
  update public.game_attempts
  set time_seconds = least(3600, ceil(extract(epoch from now() - started_at))::int + penalty_seconds)
  where id = p_attempt and status = 'in_progress'
  returning time_seconds into v_time;
  if v_time is null then return; end if;
  perform private.finish_attempt(p_attempt, p_status,
    case when p_status = 'won' then greatest(0, 600 - v_time) else 0 end);
end;
$$;

-- ---------------------------------------------------------------------------
-- State
-- ---------------------------------------------------------------------------
create or replace function private.game_state(p_challenge uuid, p_user uuid)
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
  v_done boolean;
  v_view jsonb := '{}'::jsonb;
  v_solution jsonb;
  v_title text;
  v_clues text[];
  v_number int;
begin
  select * into c from public.daily_challenges where id = p_challenge;
  if c.id is null then return null; end if;
  select * into a from public.game_attempts where challenge_id = c.id and user_id = p_user;
  select * into s from public.daily_challenge_solutions where challenge_id = c.id;
  v_done := coalesce(a.status in ('won', 'lost'), false);
  select count(*) into v_number from public.daily_challenges
  where game = c.game and status in ('published', 'retired') and challenge_date <= c.challenge_date;

  if c.game = 'hangman' then
    v_title := s.answer ->> 'title';
    v_view := jsonb_build_object(
      'mask', private.hangman_mask(v_title, array(select jsonb_array_elements_text(coalesce(a.state -> 'guessed', '[]'))), v_done),
      'guessed', coalesce(a.state -> 'guessed', '[]'::jsonb),
      'misses', coalesce((a.state ->> 'misses')::int, 0),
      'hinted', coalesce((a.state ->> 'hinted')::boolean, false));
    if v_done then v_solution := jsonb_build_object('title', v_title, 'book', private.book_card(s.answer_book_id)); end if;
  elsif c.game = 'cover' then
    v_view := jsonb_build_object(
      'wrong', coalesce(a.state -> 'wrong', '[]'::jsonb),
      'removed', coalesce(a.state -> 'removed', '[]'::jsonb),
      'level', case when v_done then 5 else jsonb_array_length(coalesce(a.state -> 'wrong', '[]'::jsonb)) end);
    if v_done then v_solution := jsonb_build_object('book', private.book_card(s.answer_book_id)); end if;
  elsif c.game = 'clues' then
    select cs.clues into v_clues from public.clue_sets cs where cs.id = (s.answer ->> 'clue_set_id')::uuid;
    v_view := jsonb_build_object(
      'clues', to_jsonb(v_clues[1:case when v_done then 5 else greatest(1, coalesce((a.state ->> 'shown')::int, 1)) end]),
      'misses', coalesce((select jsonb_agg(private.card_no_cover(x::uuid))
                          from jsonb_array_elements_text(coalesce(a.state -> 'misses', '[]')) x), '[]'::jsonb));
    if v_done then v_solution := jsonb_build_object('book', private.book_card(s.answer_book_id)); end if;
  elsif c.game = 'timeline' then
    v_view := jsonb_build_object(
      'locked', coalesce(a.state -> 'locked', '[null, null, null, null, null]'::jsonb),
      'last', a.state -> 'last');
    if v_done then
      v_solution := jsonb_build_object('order', (
        select jsonb_agg(private.book_card(x::uuid) order by o)
        from jsonb_array_elements_text(s.answer -> 'order') with ordinality t(x, o)));
    end if;
  end if;

  return jsonb_build_object(
    'id', c.id,
    'game', c.game,
    'number', v_number,
    'challenge_date', c.challenge_date,
    'payload', c.public_payload,
    'attempt', case when a.id is null then null else jsonb_build_object(
      'status', a.status,
      'started_at', a.started_at,
      'completed_at', a.completed_at,
      'penalty_seconds', a.penalty_seconds,
      'time_seconds', a.time_seconds,
      'misses', a.guesses_count,
      'hints_used', a.hints_used,
      'xp_awarded', a.xp_awarded
    ) end,
    'view', v_view,
    'solution', v_solution
  );
end;
$$;

create or replace function private.open_attempt_v2(p_challenge uuid, p_expected public.game_type default null)
returns public.game_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.daily_challenges;
  a public.game_attempts;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into c from public.daily_challenges where id = p_challenge;
  if c.id is null or not private.is_v2_game(c.game) or c.status <> 'published'
     or (p_expected is not null and c.game <> p_expected) then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  if c.challenge_date <> public.utc_today() then
    raise exception 'challenge_not_today' using errcode = 'P0001', hint = 'Only today''s game can be played.';
  end if;
  insert into public.game_attempts (user_id, challenge_id, game, challenge_date)
  values (auth.uid(), c.id, c.game, c.challenge_date)
  on conflict (user_id, challenge_id) do nothing;
  select * into a from public.game_attempts where user_id = auth.uid() and challenge_id = c.id for update;
  return a;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API
-- ---------------------------------------------------------------------------
create or replace function public.get_today_games()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(private.game_state(c.id, auth.uid()) order by
      case c.game when 'hangman' then 1 when 'cover' then 2 when 'clues' then 3 else 4 end)
    from public.daily_challenges c
    where c.challenge_date = public.utc_today() and c.status = 'published' and private.is_v2_game(c.game)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_game_state(p_challenge uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.daily_challenges
                 where id = p_challenge and status in ('published', 'retired')
                   and challenge_date <= public.utc_today() and private.is_v2_game(game)) then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  return private.game_state(p_challenge, auth.uid());
end;
$$;

-- Starts the clock (idempotent).
create or replace function public.start_game(p_challenge uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
begin
  a := private.open_attempt_v2(p_challenge);
  return private.game_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.hangman_guess(p_challenge uuid, p_letter text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
  v_title text;
  v_letter text := private.fold(left(trim(coalesce(p_letter, '')), 1));
  v_guessed text[];
  v_misses int;
begin
  a := private.open_attempt_v2(p_challenge, 'hangman');
  if a.status <> 'in_progress' then return private.game_state(p_challenge, auth.uid()); end if;
  if v_letter !~ '^[A-Z]$' then raise exception 'invalid_letter' using errcode = '22023'; end if;
  select answer ->> 'title' into v_title from public.daily_challenge_solutions where challenge_id = p_challenge;
  v_guessed := array(select jsonb_array_elements_text(coalesce(a.state -> 'guessed', '[]')));
  if v_letter = any (v_guessed) then return private.game_state(p_challenge, auth.uid()); end if;
  v_guessed := v_guessed || v_letter;
  v_misses := coalesce((a.state ->> 'misses')::int, 0);

  if not (v_letter = any (private.hangman_letters(v_title))) then
    v_misses := v_misses + 1;
    update public.game_attempts set guesses_count = guesses_count + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;
  end if;
  update public.game_attempts
  set state = state || jsonb_build_object('guessed', to_jsonb(v_guessed), 'misses', v_misses)
  where id = a.id;

  if private.hangman_letters(v_title) <@ v_guessed then
    perform private.finish_v2(a.id, 'won');
  elsif v_misses >= 6 then
    perform private.finish_v2(a.id, 'lost');
  end if;
  return private.game_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.cover_guess(p_challenge uuid, p_book uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
  c public.daily_challenges;
  v_answer uuid;
  v_wrong jsonb;
begin
  a := private.open_attempt_v2(p_challenge, 'cover');
  if a.status <> 'in_progress' then return private.game_state(p_challenge, auth.uid()); end if;
  select * into c from public.daily_challenges where id = p_challenge;
  if not exists (select 1 from jsonb_array_elements(c.public_payload -> 'options') o where (o ->> 'id')::uuid = p_book) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  v_wrong := coalesce(a.state -> 'wrong', '[]'::jsonb);
  if v_wrong ? p_book::text or coalesce(a.state -> 'removed', '[]'::jsonb) ? p_book::text then
    return private.game_state(p_challenge, auth.uid());
  end if;
  select answer_book_id into v_answer from public.daily_challenge_solutions where challenge_id = p_challenge;
  if p_book = v_answer then
    perform private.finish_v2(a.id, 'won');
  else
    v_wrong := v_wrong || to_jsonb(p_book::text);
    update public.game_attempts
    set state = state || jsonb_build_object('wrong', v_wrong),
        guesses_count = guesses_count + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;
    if jsonb_array_length(v_wrong) >= 4 then perform private.finish_v2(a.id, 'lost'); end if;
  end if;
  return private.game_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.clues_guess(p_challenge uuid, p_book uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
  v_answer uuid;
  v_misses jsonb;
  v_hit boolean;
begin
  a := private.open_attempt_v2(p_challenge, 'clues');
  if a.status <> 'in_progress' then return private.game_state(p_challenge, auth.uid()); end if;
  if not exists (select 1 from public.books where id = p_book) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_misses := coalesce(a.state -> 'misses', '[]'::jsonb);
  if v_misses ? p_book::text then return private.game_state(p_challenge, auth.uid()); end if;
  select answer_book_id into v_answer from public.daily_challenge_solutions where challenge_id = p_challenge;
  -- Another catalogue record of the same work also counts.
  select p_book = v_answer or (
    private.fold(g.title) = private.fold(t.title)
    and exists (select 1 from public.book_authors x join public.book_authors y on y.author_id = x.author_id
                where x.book_id = g.id and y.book_id = t.id)
  ) into v_hit
  from public.books g, public.books t where g.id = p_book and t.id = v_answer;

  if v_hit then
    perform private.finish_v2(a.id, 'won');
  else
    v_misses := v_misses || to_jsonb(p_book::text);
    update public.game_attempts
    set state = state || jsonb_build_object('misses', v_misses,
                  'shown', least(5, greatest(1, coalesce((state ->> 'shown')::int, 1)) + 1)),
        guesses_count = guesses_count + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;
    if jsonb_array_length(v_misses) >= 5 then perform private.finish_v2(a.id, 'lost'); end if;
  end if;
  return private.game_state(p_challenge, auth.uid());
end;
$$;

create or replace function public.timeline_submit(p_challenge uuid, p_order uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
  v_answer uuid[];
  v_result boolean[] := '{}';
  v_locked jsonb := '[]'::jsonb;
  i int;
begin
  a := private.open_attempt_v2(p_challenge, 'timeline');
  if a.status <> 'in_progress' then return private.game_state(p_challenge, auth.uid()); end if;
  select array(select jsonb_array_elements_text(answer -> 'order')::uuid) into v_answer
  from public.daily_challenge_solutions where challenge_id = p_challenge;
  if p_order is null or cardinality(p_order) <> 5
     or (select count(distinct x) from unnest(p_order) x where x = any (v_answer)) <> 5 then
    raise exception 'invalid_order' using errcode = '22023';
  end if;
  for i in 1..5 loop
    v_result := v_result || (p_order[i] = v_answer[i]);
    v_locked := v_locked || case when p_order[i] = v_answer[i] then to_jsonb(p_order[i]::text) else 'null'::jsonb end;
  end loop;
  update public.game_attempts
  set state = state || jsonb_build_object('locked', v_locked, 'last', to_jsonb(v_result))
  where id = a.id;
  if true = all (v_result) then
    perform private.finish_v2(a.id, 'won');
  else
    update public.game_attempts set guesses_count = guesses_count + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id returning * into a;
    if a.guesses_count >= 8 then perform private.finish_v2(a.id, 'lost'); end if;
  end if;
  return private.game_state(p_challenge, auth.uid());
end;
$$;

-- One hint per game (Clues: one per extra clue). Each costs 10 s.
create or replace function public.game_hint(p_challenge uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
  c public.daily_challenges;
  s public.daily_challenge_solutions;
  v_guessed text[];
  v_letter text;
  v_removed jsonb;
  v_shown int;
  v_locked jsonb;
  v_answer uuid[];
  i int;
begin
  a := private.open_attempt_v2(p_challenge);
  if a.status <> 'in_progress' then return private.game_state(p_challenge, auth.uid()); end if;
  select * into c from public.daily_challenges where id = p_challenge;
  select * into s from public.daily_challenge_solutions where challenge_id = p_challenge;

  if c.game = 'hangman' then
    if coalesce((a.state ->> 'hinted')::boolean, false) then return private.game_state(p_challenge, auth.uid()); end if;
    v_guessed := array(select jsonb_array_elements_text(coalesce(a.state -> 'guessed', '[]')));
    select l into v_letter from regexp_split_to_table(private.fold(s.answer ->> 'title'), '') with ordinality t(l, o)
    where l ~ '^[A-Z]$' and not (l = any (v_guessed)) order by o limit 1;
    if v_letter is null then return private.game_state(p_challenge, auth.uid()); end if;
    v_guessed := v_guessed || v_letter;
    update public.game_attempts
    set state = state || jsonb_build_object('guessed', to_jsonb(v_guessed), 'hinted', true),
        hints_used = hints_used + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;
    if private.hangman_letters(s.answer ->> 'title') <@ v_guessed then perform private.finish_v2(a.id, 'won'); end if;

  elsif c.game = 'cover' then
    if a.hints_used > 0 then return private.game_state(p_challenge, auth.uid()); end if;
    select coalesce(jsonb_agg(to_jsonb(x.id)), '[]'::jsonb) into v_removed from (
      select o ->> 'id' as id from jsonb_array_elements(c.public_payload -> 'options') o
      where (o ->> 'id')::uuid <> s.answer_book_id
        and not coalesce(a.state -> 'wrong', '[]'::jsonb) ? (o ->> 'id')
      order by md5((o ->> 'id') || a.user_id::text) limit 2) x;
    update public.game_attempts
    set state = state || jsonb_build_object('removed', v_removed),
        hints_used = hints_used + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;

  elsif c.game = 'clues' then
    v_shown := greatest(1, coalesce((a.state ->> 'shown')::int, 1));
    if v_shown >= 5 then return private.game_state(p_challenge, auth.uid()); end if;
    update public.game_attempts
    set state = state || jsonb_build_object('shown', v_shown + 1),
        hints_used = hints_used + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;

  elsif c.game = 'timeline' then
    if a.hints_used > 0 then return private.game_state(p_challenge, auth.uid()); end if;
    v_answer := array(select jsonb_array_elements_text(s.answer -> 'order')::uuid);
    v_locked := coalesce(a.state -> 'locked', '[null, null, null, null, null]'::jsonb);
    for i in 0..4 loop
      if v_locked -> i = 'null'::jsonb then
        v_locked := jsonb_set(v_locked, array[i::text], to_jsonb(v_answer[i + 1]::text));
        exit;
      end if;
    end loop;
    update public.game_attempts
    set state = state || jsonb_build_object('locked', v_locked),
        hints_used = hints_used + 1, penalty_seconds = penalty_seconds + 10
    where id = a.id;
  end if;
  return private.game_state(p_challenge, auth.uid());
end;
$$;

-- People the caller follows (accepted) plus the caller.
create or replace function private.my_circle()
returns table (user_id uuid) language sql stable security definer set search_path = '' as $$
  select auth.uid()
  union
  select f.followee_id from public.follows f
  where f.follower_id = auth.uid() and f.status = 'accepted'
    and not private.is_blocked_between(f.followee_id, auth.uid())
$$;

create or replace function public.get_game_leaderboard(p_challenge uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(r order by (r ->> 'rank')::int), '[]'::jsonb) from (
    select jsonb_build_object(
      'rank', row_number() over (order by a.time_seconds, a.guesses_count, a.completed_at),
      'user_id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
      'time_seconds', a.time_seconds, 'tries', a.guesses_count + 1, 'is_me', p.id = auth.uid()) r
    from public.game_attempts a
    join private.my_circle() m on m.user_id = a.user_id
    join public.profiles p on p.id = a.user_id
    where a.challenge_id = p_challenge and a.status = 'won' and auth.uid() is not null
  ) x
$$;

-- This week's (Monday-based, UTC) total; a game not won counts as 3 minutes.
create or replace function public.get_weekly_leaderboard()
returns jsonb language sql stable security definer set search_path = '' as $$
  with week as (
    select c.id from public.daily_challenges c
    where c.status in ('published', 'retired') and private.is_v2_game(c.game)
      and c.challenge_date between date_trunc('week', public.utc_today())::date and public.utc_today()
  ), players as (
    select distinct a.user_id from public.game_attempts a
    join week w on w.id = a.challenge_id
    join private.my_circle() m on m.user_id = a.user_id
  ), totals as (
    select pl.user_id,
      sum(coalesce((select a.time_seconds from public.game_attempts a
                    where a.user_id = pl.user_id and a.challenge_id = w.id and a.status = 'won'), 180))::int as total,
      count(*) filter (where exists (select 1 from public.game_attempts a
                    where a.user_id = pl.user_id and a.challenge_id = w.id and a.status = 'won'))::int as won
    from players pl cross join week w
    group by pl.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'rank', x.rank, 'user_id', p.id, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'time_seconds', x.total, 'won', x.won, 'is_me', p.id = auth.uid())
    order by x.rank), '[]'::jsonb)
  from (select t.*, row_number() over (order by t.total, t.won desc) as rank from totals t) x
  join public.profiles p on p.id = x.user_id
  where auth.uid() is not null
$$;

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------
create or replace function private.last_used(p_book uuid, p_game public.game_type)
returns date language sql stable security definer set search_path = '' as $$
  select max(dc.challenge_date) from public.daily_challenge_solutions s
  join public.daily_challenges dc on dc.id = s.challenge_id
  where s.answer_book_id = p_book and dc.game = p_game
$$;

create or replace function private.schedule_games_v2(p_from date, p_days int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
  v_created int := 0;
  v_book public.books;
  v_challenge uuid;
  v_options jsonb;
  v_clue_set uuid;
  v_book_id uuid;
  v_ids uuid[];
begin
  for v_day in select generate_series(p_from, p_from + p_days - 1, interval '1 day')::date loop
    -- Hangman: curated titles with 4 to 22 letters.
    if not exists (select 1 from public.daily_challenges where game = 'hangman' and challenge_date = v_day) then
      select b.* into v_book from public.books b
      where b.is_curated
        and char_length(regexp_replace(private.fold(b.title), '[^A-Z]', '', 'g')) between 4 and 22
      order by private.last_used(b.id, 'hangman') nulls first, md5(b.id::text || 'hangman')
      limit 1;
      if v_book.id is not null then
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('hangman', v_day, 2, 'published', jsonb_build_object(
          'mask', private.hangman_mask(v_book.title, '{}'),
          'max_misses', 6,
          'year', v_book.first_published_year,
          'genre', (select g.name from public.genres g where g.id = v_book.primary_genre_id)))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, answer_book_id, answer)
        values (v_challenge, v_book.id, jsonb_build_object('title', v_book.title));
        v_created := v_created + 1;
      end if;
    end if;

    -- Hidden Cover: a verified cover and five plausible distractors.
    if not exists (select 1 from public.daily_challenges where game = 'cover' and challenge_date = v_day) then
      select b.* into v_book from public.books b
      where b.is_curated and b.cover_url is not null
      order by private.last_used(b.id, 'cover') nulls first, md5(b.id::text || 'cover2')
      limit 1;
      if v_book.id is not null then
        select jsonb_agg(private.card_no_cover(x.id) order by md5(x.id::text || v_day::text)) into v_options
        from (
          select v_book.id as id
          union all
          select d.id from (
            select b2.id from public.books b2
            where b2.is_curated and b2.id <> v_book.id
            order by (b2.primary_genre_id is not distinct from v_book.primary_genre_id) desc,
                     md5(b2.id::text || v_day::text)
            limit 5
          ) d
        ) x;
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('cover', v_day, 2, 'published', jsonb_build_object(
          'cover_url', v_book.cover_url, 'max_errors', 4, 'options', v_options))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, answer_book_id) values (v_challenge, v_book.id);
        v_created := v_created + 1;
      end if;
    end if;

    -- Clues: only validated clue sets.
    if not exists (select 1 from public.daily_challenges where game = 'clues' and challenge_date = v_day) then
      v_clue_set := null;
      select cs.id, cs.book_id into v_clue_set, v_book_id
      from public.clue_sets cs
      where cs.validated_at is not null
      order by private.last_used(cs.book_id, 'clues') nulls first, md5(cs.book_id::text || 'clues')
      limit 1;
      if v_clue_set is not null then
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('clues', v_day, 2, 'published', jsonb_build_object('total_clues', 5, 'max_misses', 5))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, answer_book_id, answer)
        values (v_challenge, v_book_id, jsonb_build_object('clue_set_id', v_clue_set));
        v_created := v_created + 1;
      end if;
    end if;

    -- Timeline: five curated books with distinct publication years.
    if not exists (select 1 from public.daily_challenges where game = 'timeline' and challenge_date = v_day) then
      select array_agg(y.id order by y.first_published_year, y.title) into v_ids from (
        select * from (
          select distinct on (b.first_published_year) b.id, b.first_published_year, b.title
          from public.books b where b.is_curated and b.first_published_year is not null
          order by b.first_published_year, md5(b.id::text || v_day::text)
        ) d order by md5(d.id::text || v_day::text || 'timeline') limit 5
      ) y;
      if cardinality(v_ids) = 5 then
        insert into public.daily_challenges (game, challenge_date, difficulty, status, public_payload)
        values ('timeline', v_day, 2, 'published', jsonb_build_object(
          'books', (select jsonb_agg(private.book_card(x) - 'first_published_year' order by md5(x::text || 'shuffle'))
                    from unnest(v_ids) x)))
        returning id into v_challenge;
        insert into public.daily_challenge_solutions (challenge_id, answer)
        values (v_challenge, jsonb_build_object('order', to_jsonb(v_ids)));
        v_created := v_created + 1;
      end if;
    end if;
  end loop;
  return v_created;
end;
$$;

-- Retire v1 games from tomorrow; today's stay playable.
update public.daily_challenges set status = 'retired'
where game in ('bookle', 'cover_reveal', 'quiz') and challenge_date > public.utc_today() and status <> 'retired';

do $$
begin
  if exists (select 1 from cron.job where jobname = 'grimore-schedule-challenges') then
    perform cron.unschedule('grimore-schedule-challenges');
  end if;
end;
$$;
select cron.schedule('grimore-schedule-challenges', '5 0 * * *',
  $$select private.schedule_games_v2(public.utc_today(), 14)$$);

-- ---------------------------------------------------------------------------
-- Achievements v2 (with progress)
-- ---------------------------------------------------------------------------
update public.achievements set description = 'Finish every daily game in a single day.' where id = 'perfect_day';
insert into public.achievements (id, name, description, icon, category, xp_reward, sort_order) values
  ('flawless_hangman', 'Steady Flame', 'Solve Hangman without losing a candle.', 'flame', 'games', 20, 20),
  ('first_glance', 'First Glance', 'Name the Hidden Cover with no wrong guesses.', 'eye', 'games', 20, 21),
  ('one_clue', 'One Clue Wonder', 'Solve Clues from the very first clue.', 'lightbulb', 'games', 25, 22),
  ('time_keeper', 'Timekeeper', 'Order the Timeline on the first try.', 'hourglass', 'games', 20, 23),
  ('speed_reader', 'Quick Draw', 'Win a daily game in under 30 seconds.', 'lightning', 'games', 15, 24),
  ('first_book', 'First Chapter', 'Finish your first book.', 'book-open', 'reading', 10, 30),
  ('ten_books', 'Bookworm', 'Finish ten books.', 'books', 'reading', 30, 31),
  ('fifty_books', 'Library Dragon', 'Finish fifty books.', 'crown', 'reading', 100, 32),
  ('thousand_pages', 'Page Turner', 'Log 1,000 pages.', 'bookmark', 'reading', 30, 33),
  ('quote_keeper', 'Quote Keeper', 'Save five quotes.', 'quotes', 'reading', 15, 34),
  ('reading_streak_7', 'Seven Nights', 'Read seven days in a row.', 'moon', 'streak', 30, 35),
  ('first_review', 'Critic', 'Write your first review.', 'star', 'social', 10, 40),
  ('joined_community', 'Among Friends', 'Join a community.', 'users', 'social', 10, 41),
  ('first_listing', 'Bookseller', 'List a book on the Market.', 'storefront', 'social', 10, 42)
on conflict (id) do nothing;

create or replace function public.get_achievements(p_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  v_read int;
  v_pages int;
  v_quotes int;
  v_reviews int;
  v_communities int;
  v_listings int;
  v_streak int;
  v_reading_streak int;
  v_perfect int;
  v_quiz int;
  r record;
  v_progress int;
  v_target int;
begin
  if v_user is null or not private.can_view_user(v_user) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select count(*) into v_read from public.user_books where user_id = v_user and status = 'read';
  select greatest(coalesce((select sum(pages_read) from public.reading_sessions where user_id = v_user), 0),
                  coalesce((select pages_read from public.user_statistics where user_id = v_user), 0))::int into v_pages;
  select count(*) into v_quotes from public.user_quotes where user_id = v_user;
  select count(*) into v_reviews from public.reviews where user_id = v_user;
  select count(*) into v_communities from public.community_members where user_id = v_user and role <> 'host';
  select count(*) into v_listings from public.market_listings where seller_id = v_user;
  select coalesce(longest_streak, 0), coalesce(perfect_days, 0) into v_streak, v_perfect
  from public.user_streaks where user_id = v_user;
  select coalesce(won, 0) into v_quiz from public.user_game_statistics where user_id = v_user and game = 'quiz';
  v_reading_streak := coalesce((public.get_reading_streak(v_user) ->> 'longest')::int, 0);

  -- Award reading and social milestones for the caller on read.
  if v_user = auth.uid() then
    for r in
      select a.id, t.progress, t.target from public.achievements a
      cross join lateral (select
        case a.id
          when 'first_book' then v_read when 'ten_books' then v_read when 'fifty_books' then v_read
          when 'thousand_pages' then v_pages when 'quote_keeper' then v_quotes
          when 'first_review' then v_reviews when 'joined_community' then v_communities
          when 'first_listing' then v_listings when 'reading_streak_7' then v_reading_streak
        end as progress,
        case a.id
          when 'first_book' then 1 when 'ten_books' then 10 when 'fifty_books' then 50
          when 'thousand_pages' then 1000 when 'quote_keeper' then 5 when 'first_review' then 1
          when 'joined_community' then 1 when 'first_listing' then 1 when 'reading_streak_7' then 7
        end as target) t
      where t.target is not null and t.progress >= t.target
        and not exists (select 1 from public.user_achievements ua where ua.user_id = v_user and ua.achievement_id = a.id)
    loop
      perform private.award_achievement(v_user, r.id);
    end loop;
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'description', a.description, 'icon', a.icon,
      'category', a.category, 'xp_reward', a.xp_reward, 'earned_at', ua.earned_at,
      'progress', least(t.target, t.progress), 'target', t.target
    ) order by (ua.earned_at is null), a.sort_order), '[]'::jsonb)
    from public.achievements a
    left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = v_user
    cross join lateral (select
      coalesce(case a.id
        when 'first_book' then v_read when 'ten_books' then v_read when 'fifty_books' then v_read
        when 'thousand_pages' then v_pages when 'quote_keeper' then v_quotes
        when 'first_review' then v_reviews when 'joined_community' then v_communities
        when 'first_listing' then v_listings when 'reading_streak_7' then v_reading_streak
        when 'streak_3' then v_streak when 'streak_7' then v_streak when 'streak_30' then v_streak
        when 'perfect_day' then v_perfect when 'literary_mind' then v_quiz
      end, case when ua.earned_at is not null then 1 else 0 end) as progress,
      case a.id
        when 'first_book' then 1 when 'ten_books' then 10 when 'fifty_books' then 50
        when 'thousand_pages' then 1000 when 'quote_keeper' then 5 when 'reading_streak_7' then 7
        when 'streak_3' then 3 when 'streak_7' then 7 when 'streak_30' then 30 when 'literary_mind' then 10
        else 1
      end as target) t
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.get_today_games()', 'public.get_game_state(uuid)', 'public.start_game(uuid)',
    'public.hangman_guess(uuid, text)', 'public.cover_guess(uuid, uuid)', 'public.clues_guess(uuid, uuid)',
    'public.timeline_submit(uuid, uuid[])', 'public.game_hint(uuid)', 'public.get_game_leaderboard(uuid)',
    'public.get_weekly_leaderboard()', 'public.get_achievements(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
