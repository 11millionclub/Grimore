import { useQuery } from '@tanstack/react-query';

import { qk } from '@/lib/query-client';
import { getGenres } from '@/services/catalogue';
import { getProgress, getTodayChallenges } from '@/services/games';
import { countReadInYear, getGoal } from '@/services/library';
import { getAchievements, getFavoriteBooks, getFavoriteGenres, getPreferences, getProfile, getStatistics } from '@/services/profile';
import { useSessionStore } from '@/stores/session';

export function useMyId(): string | undefined {
  return useSessionStore((s) => s.session?.user.id);
}

export function useProfile(id: string | undefined) {
  return useQuery({ queryKey: qk.profile(id ?? ''), queryFn: () => getProfile(id!), enabled: !!id });
}

export function useMyProfile() {
  return useProfile(useMyId());
}

export function useStatistics(id: string | undefined) {
  return useQuery({ queryKey: qk.stats(id ?? ''), queryFn: () => getStatistics(id!), enabled: !!id });
}

export function useProgress(id: string | undefined) {
  const me = useMyId();
  return useQuery({ queryKey: qk.progress(id ?? ''), queryFn: () => getProgress(id === me ? undefined : id), enabled: !!id });
}

export function useTodayChallenges() {
  return useQuery({ queryKey: qk.today, queryFn: getTodayChallenges, staleTime: 30_000 });
}

export function useGenres() {
  return useQuery({ queryKey: qk.genres, queryFn: getGenres, staleTime: Infinity });
}

export function usePreferences() {
  const id = useMyId();
  return useQuery({ queryKey: qk.preferences, queryFn: () => getPreferences(id!), enabled: !!id });
}

export function useFavoriteGenres(id: string | undefined) {
  return useQuery({ queryKey: ['favoriteGenres', id], queryFn: () => getFavoriteGenres(id!), enabled: !!id });
}

export function useFavoriteBooks(id: string | undefined) {
  return useQuery({ queryKey: qk.favorites(id ?? ''), queryFn: () => getFavoriteBooks(id!), enabled: !!id });
}

export function useAchievements(id: string | undefined) {
  return useQuery({ queryKey: qk.achievements(id ?? ''), queryFn: () => getAchievements(id!), enabled: !!id });
}

export function useReadingGoal(id: string | undefined, year = new Date().getFullYear()) {
  return useQuery({
    queryKey: qk.goal(id ?? '', year),
    enabled: !!id,
    queryFn: async () => {
      const [goal, read] = await Promise.all([getGoal(id!, year), countReadInYear(id!, year)]);
      return { target: goal?.target_books ?? null, read, year };
    },
  });
}
