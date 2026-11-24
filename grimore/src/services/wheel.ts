import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { getFavoriteGenres } from '@/services/profile';
import { TROPES } from '@/utils/review-tags';

import { getSuggestions } from './catalogue';
import { listAllByStatus, listByStatus } from './library';

export type WheelSource = 'tbr' | 'owned' | 'rec';
export type WheelBook = {
  id: string;
  title: string;
  cover_url: string | null;
  authors: string;
  genreIds: number[];
  tropes: string[];
  spice: number | null;
  priority: boolean;
  pages: number | null;
};

const TROPE_KEYS = new Set<string>(TROPES.map((t) => t.key));

/**
 * Books the wheel can land on: your wishlist ("to be read"), books you own
 * and have not finished, or recommendations from your favourite genres and
 * the genres you read most. Each comes with its genres, the tropes readers
 * tagged and the average spice, for the filters.
 */
export async function wheelPool(userId: string, source: WheelSource): Promise<WheelBook[]> {
  let base: Omit<WheelBook, 'genreIds' | 'tropes' | 'spice' | 'pages'>[] = [];
  const pagesOf = new Map<string, number | null>();
  const own = new Map<string, number | null>();
  if (source === 'tbr' || source === 'owned') {
    const rows = source === 'tbr' ? await listAllByStatus(userId, 'want_to_read') : (await listAllByStatus(userId, 'owned')).filter((e) => e.status !== 'read' && e.status !== 'dnf');
    rows.forEach((e) => {
      own.set(e.book.id, e.spice);
      pagesOf.set(e.book.id, e.book.page_count_estimate);
    });
    base = rows.map((e) => ({ id: e.book.id, title: e.book.title, cover_url: e.book.cover_url, authors: e.book.authors, priority: e.is_priority }));
  } else {
    const [favs, read, mine] = await Promise.all([
      getFavoriteGenres(userId),
      listByStatus(userId, 'read', 200),
      supabase.from('user_books').select('book_id').eq('user_id', userId).limit(5000),
    ]);
    const readIds = read.map((e) => e.book.id);
    const counts = new Map<number, number>();
    if (readIds.length) {
      const g = unwrap(await supabase.from('book_genres').select('genre_id').in('book_id', readIds.slice(0, 200))) as { genre_id: number }[];
      g.forEach((r) => counts.set(r.genre_id, (counts.get(r.genre_id) ?? 0) + 1));
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
    const genreIds = [...new Set([...favs.map((g) => g.id), ...top])];
    const exclude = (unwrap(mine) as { book_id: string }[]).map((r) => r.book_id);
    const recs = await getSuggestions(genreIds, exclude, 30);
    base = recs.map((b) => ({ id: b.id, title: b.title, cover_url: b.cover_url, authors: b.authors, priority: false }));
  }
  if (!base.length) return [];
  const ids = base.map((b) => b.id);
  const [genres, tags, spice, pages] = await Promise.all([
    supabase.from('book_genres').select('book_id, genre_id').in('book_id', ids),
    supabase.rpc('book_tags', { p_books: ids }),
    supabase.from('reviews').select('book_id, spice').in('book_id', ids).not('spice', 'is', null).limit(5000),
    pagesOf.size ? Promise.resolve({ data: [], error: null }) : supabase.from('books').select('id, page_count_estimate').in('id', ids),
  ]);
  ((unwrap(pages) ?? []) as { id: string; page_count_estimate: number | null }[]).forEach((b) => pagesOf.set(b.id, b.page_count_estimate));
  const gMap = new Map<string, number[]>();
  (unwrap(genres) as { book_id: string; genre_id: number }[]).forEach((r) => gMap.set(r.book_id, [...(gMap.get(r.book_id) ?? []), r.genre_id]));
  const tMap = new Map<string, string[]>();
  ((unwrap(tags) ?? []) as { book_id: string; tag: string }[]).filter((r) => TROPE_KEYS.has(r.tag)).forEach((r) => tMap.set(r.book_id, [...(tMap.get(r.book_id) ?? []), r.tag]));
  const sMap = new Map<string, { n: number; t: number }>();
  (unwrap(spice) as { book_id: string; spice: number }[]).forEach((r) => {
    const x = sMap.get(r.book_id) ?? { n: 0, t: 0 };
    sMap.set(r.book_id, { n: x.n + 1, t: x.t + r.spice });
  });
  return base.map((b) => {
    const s = sMap.get(b.id);
    const mine = own.get(b.id);
    return { ...b, genreIds: gMap.get(b.id) ?? [], tropes: tMap.get(b.id) ?? [], spice: mine ?? (s ? Math.round(s.t / s.n) : null), pages: pagesOf.get(b.id) ?? null };
  });
}

export async function spinsLeft(): Promise<number> {
  return Number(unwrap(await supabase.rpc('wheel_spins_left')) ?? 0);
}

/** Uses one of today's three spins (one spin and two rerolls); throws no_spins_left when they are gone. */
export async function takeSpin(bookId: string | null): Promise<number> {
  return Number(unwrap(await supabase.rpc('use_wheel_spin', { p_book: bookId as string })));
}
