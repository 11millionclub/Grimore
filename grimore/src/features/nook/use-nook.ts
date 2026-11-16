import { useQuery } from '@tanstack/react-query';

import type { SceneId } from '@/components/nook/library-scene';
import { unwrap } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { getFavoriteAuthors, getQuotes } from '@/services/corner';
import { listLibrary } from '@/services/library';
import { getFavoriteBooks } from '@/services/profile';
import type { SealColorId, ShelfWoodId } from '@/theme';

export type NookFrame = 'arch' | 'circle' | 'shield';
export type NookSettings = {
  scene: SceneId | 'custom';
  background_url: string | null;
  seal: SealColorId;
  frame: NookFrame;
  shelf: ShelfWoodId;
  title: string | null;
  featured_book_id: string | null;
};

export const DEFAULT_NOOK: NookSettings = {
  scene: 'great-hall',
  background_url: null,
  seal: 'wine',
  frame: 'arch',
  shelf: 'oak',
  title: null,
  featured_book_id: null,
};

export type NookBook = { id: string; title: string; cover_url: string | null; authors: string };

/** Everything a Nook shows, assembled from public pieces only. */
export function useNook(userId: string | undefined) {
  return useQuery({
    queryKey: qk.corner(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const id = userId!;
      const [settings, favourites, reading, quotes, authors] = await Promise.all([
        supabase.rpc('get_nook_settings', { p_user: id }).then((r) => ({ ...DEFAULT_NOOK, ...((unwrap(r) ?? {}) as Partial<NookSettings>) })),
        getFavoriteBooks(id),
        listLibrary({ userId: id, status: 'reading', sort: 'updated' }).then((r) => r.items.slice(0, 4)),
        getQuotes(id),
        getFavoriteAuthors(id),
      ]);
      const readingBooks: NookBook[] = reading.map((e) => ({ id: e.book.id, title: e.book.title, cover_url: e.book.cover_url, authors: e.book.authors }));
      const featured = (settings.featured_book_id && favourites.find((f) => f.id === settings.featured_book_id)) || readingBooks[0] || favourites[0] || null;
      return { settings, favourites, reading: readingBooks, featured, quote: quotes[0] ?? null, authors };
    },
  });
}
