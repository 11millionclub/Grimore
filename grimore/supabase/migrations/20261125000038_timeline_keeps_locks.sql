-- GriMore — Timeline: a book placed correctly (by a check or by the hint) stays locked.
-- Before, each check rebuilt the locks from that order alone, so the hint's lock could vanish.
create or replace function public.timeline_submit(p_challenge uuid, p_order uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.game_attempts;
  v_answer uuid[];
  v_prev jsonb;
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
  v_prev := coalesce(a.state -> 'locked', '[null, null, null, null, null]'::jsonb);
  for i in 1..5 loop
    v_result := v_result || (p_order[i] = v_answer[i]);
    v_locked := v_locked || case
      when p_order[i] = v_answer[i] then to_jsonb(p_order[i]::text)
      when v_prev -> (i - 1) <> 'null'::jsonb then v_prev -> (i - 1)
      else 'null'::jsonb end;
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
revoke all on function public.timeline_submit(uuid, uuid[]) from public, anon;
grant execute on function public.timeline_submit(uuid, uuid[]) to authenticated;
