-- GriMore — retire the first-generation game functions and the Sorting soft-balance
-- helper. The app no longer calls them; closing them stops anyone playing
-- retired game types for points or probing answers. Nothing is deleted.
revoke execute on function public.bookle_guess(uuid, uuid), public.cover_reveal_answer(uuid, uuid), public.cover_reveal_hint(uuid),
  public.get_challenge_state(uuid), public.get_today_challenges(), public.quiz_answer(uuid, smallint), public.house_balance()
  from public, anon, authenticated;
