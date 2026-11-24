import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (count, error) => count < 2 && (error as { code?: string })?.code === 'network',
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});

// Refetch stale data when the app returns to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
}

onlineManager.setOnline(true);

/** Central query-key factory so invalidation stays consistent. */
export const qk = {
  session: ['session'] as const,
  profile: (id: string) => ['profile', id] as const,
  profileByUsername: (username: string) => ['profile', 'username', username] as const,
  preferences: ['preferences'] as const,
  stats: (id: string) => ['stats', id] as const,
  progress: (id: string) => ['progress', id] as const,
  library: (filter: string) => ['library', filter] as const,
  libraryAll: ['library'] as const,
  libraryEntry: (bookId: string) => ['library', 'entry', bookId] as const,
  book: (id: string) => ['book', id] as const,
  bookReviews: (id: string) => ['book', id, 'reviews'] as const,
  catalogueSearch: (q: string) => ['catalogue', q] as const,
  externalSearch: (q: string) => ['external', q] as const,
  genres: ['genres'] as const,
  today: ['games', 'today'] as const,
  challenge: (id: string) => ['games', 'challenge', id] as const,
  feed: (scope: string) => ['feed', scope] as const,
  post: (id: string) => ['post', id] as const,
  review: (id: string) => ['review', id] as const,
  comments: (kind: string, id: string) => ['comments', kind, id] as const,
  follow: (id: string) => ['follow', id] as const,
  achievements: (id: string) => ['achievements', id] as const,
  favorites: (id: string) => ['favorites', id] as const,
  corner: (id: string) => ['corner', id] as const,
  notifications: ['notifications'] as const,
  goal: (id: string, year: number) => ['goal', id, year] as const,
  suggestions: ['suggestions'] as const,
};

/**
 * Everything that shows a reader's books: library lists, status shelves
 * (/shelf/<user>:<status>), custom shelves, stats and the reading streak.
 * Call after any change to a library entry so no list shows a stale status.
 */
export function refreshLibrary(client: QueryClient = queryClient) {
  return Promise.all(
    [['library'], ['shelf'], ['shelves'], ['readingStats'], ['streak'], ['book']].map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
