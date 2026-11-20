import type { OnboardingResult } from '@/components/onboarding-flow';

import { joinCommunity } from './communities';
import { setGoal } from './library';
import { addFavoriteBook, setFavoriteGenres, updateProfile } from './profile';
import { follow } from './social';

/** Persist everything the onboarding collected. Best effort for the optional extras. */
export async function saveOnboarding(userId: string, r: OnboardingResult, complete: boolean) {
  if (r.genreIds.length) await setFavoriteGenres(userId, r.genreIds);
  await Promise.allSettled([
    ...r.favourites.map((b, i) => addFavoriteBook(userId, b.id, i)),
    r.goal ? setGoal(userId, new Date().getFullYear(), r.goal) : Promise.resolve(),
    ...r.follow.map((id) => follow(userId, id)),
    ...r.join.map((id) => joinCommunity(id, userId, false)),
  ]);
  await updateProfile(userId, { archetype: r.archetype, ...(complete ? { onboarding_completed_at: new Date().toISOString() } : {}) });
}
