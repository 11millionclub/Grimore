import { useQuery } from '@tanstack/react-query';
import { getMyHouse, readerHouses } from '@/services/houses';

import { qk } from '@/lib/query-client';
import { getGenres } from '@/services/catalogue';
import { getCorner, getPurchases, getShop } from '@/services/corner';
import { getAchievements, getTodayGames } from '@/services/games';
import { countReadInYear, getGoal, getReadingStreak, listByStatus } from '@/services/library';
import { listConversations } from '@/services/messages';
import { getCounts, getFavoriteBooks, getPreferences, getProfile, getProfileByUsername } from '@/services/profile';
import { unreadNotificationCount } from '@/services/social';
import { getReadingStats } from '@/services/stats';
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

export function useProfileByUsername(username: string | undefined) {
  return useQuery({ queryKey: qk.profileByUsername(username ?? ''), queryFn: () => getProfileByUsername(username!), enabled: !!username });
}

export function useCounts(id: string | undefined) {
  return useQuery({ queryKey: ['counts', id], queryFn: () => getCounts(id!), enabled: !!id });
}

export function useGenres() {
  return useQuery({ queryKey: qk.genres, queryFn: getGenres, staleTime: Infinity });
}

export function usePreferences() {
  const id = useMyId();
  return useQuery({ queryKey: qk.preferences, queryFn: () => getPreferences(id!), enabled: !!id });
}

export function useFavoriteBooks(id: string | undefined) {
  return useQuery({ queryKey: qk.favorites(id ?? ''), queryFn: () => getFavoriteBooks(id!), enabled: !!id });
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

export function useStreak(id?: string) {
  const me = useMyId();
  const target = id ?? me;
  return useQuery({ queryKey: ['streak', target], queryFn: () => getReadingStreak(target === me ? undefined : target), enabled: !!target });
}

export function useShelf(id: string | undefined, status: Parameters<typeof listByStatus>[1]) {
  return useQuery({ queryKey: qk.library(`${id}:${status}`), queryFn: () => listByStatus(id!, status), enabled: !!id });
}

export function useTodayGames() {
  return useQuery({ queryKey: qk.today, queryFn: getTodayGames, staleTime: 30_000 });
}

export function useAchievements(id?: string) {
  const me = useMyId();
  const target = id ?? me;
  return useQuery({ queryKey: qk.achievements(target ?? ''), queryFn: () => getAchievements(target === me ? undefined : target), enabled: !!target });
}

export function useCorner(id: string | undefined) {
  return useQuery({ queryKey: qk.corner(id ?? ''), queryFn: () => getCorner(id!), enabled: !!id });
}

export function useShop() {
  const id = useMyId();
  return useQuery({
    queryKey: ['shop', id],
    enabled: !!id,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [items, owned] = await Promise.all([getShop(), getPurchases(id!)]);
      return { items, owned };
    },
  });
}

export function useReadingStats(id: string | undefined, year = new Date().getFullYear()) {
  return useQuery({ queryKey: ['readingStats', id, year], queryFn: () => getReadingStats(id!, year), enabled: !!id });
}

export function useUnread() {
  const id = useMyId();
  return useQuery({
    queryKey: ['unread', id],
    enabled: !!id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [notifications, conversations] = await Promise.all([unreadNotificationCount(id!), listConversations().catch(() => [])]);
      return { notifications, messages: conversations.reduce((a, c) => a + (c.unread ?? 0), 0) };
    },
  });
}

export function useConversations() {
  return useQuery({ queryKey: ['conversations'], queryFn: listConversations, refetchInterval: 30_000 });
}

export function useMyHouse() {
  const id = useMyId();
  return useQuery({ queryKey: ['myHouse', id], queryFn: getMyHouse, enabled: !!id, staleTime: 5 * 60_000 });
}

/** Houses for a list of readers (respects "hide my House"). */
export function useReaderHouses(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({ queryKey: ['readerHouses', key], queryFn: () => readerHouses(key), enabled: key.length > 0, staleTime: 10 * 60_000 });
}
