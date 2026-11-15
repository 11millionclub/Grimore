import { useQuery } from '@tanstack/react-query';

import type { CornerData } from '@/components/corner/my-corner';
import { qk } from '@/lib/query-client';
import { getFavoriteAuthors, getQuotes } from '@/services/corner';
import { listLibrary } from '@/services/library';
import { getFavoriteBooks } from '@/services/profile';
import { supabase } from '@/lib/supabase';
import type { CornerThemeId } from '@/theme';

type CornerSettings = { layout: CornerData['layout']; theme: CornerThemeId; arrangement: CornerData['arrangement']; featured_book_id: string | null };

/**
 * Assemble My Corner from public pieces: appearance (get_corner_settings),
 * favourites, current reads, the first saved quote and favourite authors.
 */
export function useCorner(userId: string | undefined, ownerName: string) {
  return useQuery({
    queryKey: qk.corner(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<CornerData> => {
      const id = userId!;
      const [settings, favourites, reading, quotes, authors, achievements] = await Promise.all([
        supabase.rpc('get_corner_settings', { p_user: id }).then((r) => (r.data ?? null) as CornerSettings | null),
        getFavoriteBooks(id),
        listLibrary({ userId: id, status: 'reading', sort: 'updated' }).then((r) => r.items.slice(0, 4)),
        getQuotes(id),
        getFavoriteAuthors(id),
        supabase.from('user_achievements').select('achievement_id', { count: 'exact', head: true }).eq('user_id', id),
      ]);
      const featured = settings?.featured_book_id ? favourites.find((f) => f.id === settings.featured_book_id) ?? null : null;
      return {
        layout: settings?.layout ?? 'editorial',
        theme: settings?.theme ?? 'ivory',
        arrangement: settings?.arrangement ?? 'spine',
        featured,
        favourites,
        reading: reading.map((e) => ({ id: e.book.id, title: e.book.title, cover_url: e.book.cover_url, authors: e.book.authors })),
        quote: quotes[0] ? { body: quotes[0].body, attribution: quotes[0].attribution } : null,
        authors: authors.map((a) => ({ id: a.id, name: a.name })),
        achievements: achievements.count ?? 0,
        ownerName,
      };
    },
  });
}
