import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { authorLine, toSummary, type BookSummary } from './catalogue';

const summarySelect = 'id, title, cover_url, first_published_year, primary_genre_id, book_authors(position, role, authors(name))' as const;
type Raw = Parameters<typeof toSummary>[0] & { primary_genre_id: number | null };

/** Books most added to libraries in the last 7 days (falls back to curated picks). */
export async function trendingBooks(limit = 8): Promise<BookSummary[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rows = unwrap(await supabase.from('user_books').select('book_id').gte('added_at', since).limit(2000));
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.book_id, (counts.get(r.book_id) ?? 0) + 1));
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  const books = ids.length ? (unwrap(await supabase.from('books').select(summarySelect).in('id', ids)) as unknown as Raw[]).map(toSummary) : [];
  const ordered = ids.map((id) => books.find((b) => b.id === id)).filter((b): b is BookSummary => !!b);
  if (ordered.length >= 4) return ordered;
  const extra = (unwrap(await supabase.from('books').select(summarySelect).eq('is_curated', true).not('cover_url', 'is', null).gte('first_published_year', 1980).limit(limit)) as unknown as Raw[]).map(toSummary);
  return [...ordered, ...extra.filter((b) => !ordered.some((o) => o.id === b.id))].slice(0, limit);
}

export async function myBookIds(userId: string): Promise<Set<string>> {
  return new Set(unwrap(await supabase.from('user_books').select('book_id').eq('user_id', userId).limit(5000)).map((r) => r.book_id));
}

/** "Because you read X": same genre as your best-rated read, not yet in your library. */
export async function becauseYouRead(userId: string): Promise<{ title: string; books: BookSummary[] } | null> {
  const top = unwrap(
    await supabase
      .from('user_books')
      .select('rating, book:books!inner(id, title, primary_genre_id)')
      .eq('user_id', userId)
      .eq('status', 'read')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(1),
  ) as unknown as { book: { id: string; title: string; primary_genre_id: number | null } }[];
  const anchor = top[0]?.book;
  if (!anchor?.primary_genre_id) return null;
  const mine = await myBookIds(userId);
  const rows = (unwrap(await supabase.from('books').select(summarySelect).eq('primary_genre_id', anchor.primary_genre_id).eq('is_curated', true).limit(30)) as unknown as Raw[])
    .filter((b) => !mine.has(b.id))
    .map(toSummary)
    .slice(0, 8);
  return rows.length ? { title: `Because you read ${anchor.title}`, books: rows } : null;
}

export async function booksByGenreSlug(slug: string, limit = 12): Promise<BookSummary[]> {
  const g = unwrap(await supabase.from('genres').select('id').eq('slug', slug).maybeSingle());
  if (!g) return [];
  return (unwrap(await supabase.from('books').select(summarySelect).eq('primary_genre_id', g.id).order('is_curated', { ascending: false }).limit(limit)) as unknown as Raw[]).map(toSummary);
}

export async function booksByGenreId(id: number, limit = 60): Promise<BookSummary[]> {
  return (unwrap(await supabase.from('books').select(summarySelect).eq('primary_genre_id', id).order('is_curated', { ascending: false }).order('first_published_year').limit(limit)) as unknown as Raw[]).map(toSummary);
}

export async function classics(limit = 10): Promise<BookSummary[]> {
  return (unwrap(await supabase.from('books').select(summarySelect).eq('is_curated', true).lt('first_published_year', 1900).limit(limit)) as unknown as Raw[]).map(toSummary);
}

/** Genres with curated counts and two covers each, for the browse grid. */
export async function genreTiles() {
  const [genres, books] = await Promise.all([
    supabase.from('genres').select('id, name, slug').order('sort_order'),
    supabase.from('books').select('id, title, cover_url, primary_genre_id').eq('is_curated', true).not('cover_url', 'is', null).limit(500),
  ]);
  const list = unwrap(books);
  return unwrap(genres)
    .map((g) => {
      const mine = list.filter((b) => b.primary_genre_id === g.id);
      return { ...g, count: mine.length, covers: mine.slice(0, 2) };
    })
    .filter((g) => g.count > 0)
    .slice(0, 10);
}

/** Books by one author (author page). */
export async function booksByAuthor(name: string) {
  const author = unwrap(await supabase.from('authors').select('id, name, bio, birth_year, nationality_code').ilike('name', name).limit(1).maybeSingle());
  if (!author) return { author: null, books: [] as (BookSummary & { pages: number | null })[] };
  const rows = unwrap(
    await supabase
      .from('book_authors')
      .select('book:books!inner(id, title, cover_url, first_published_year, page_count_estimate, book_authors(position, role, authors(name)))')
      .eq('author_id', author.id)
      .limit(100),
  ) as unknown as { book: Raw & { page_count_estimate: number | null } }[];
  const books = rows
    .map((r) => ({ ...toSummary(r.book), pages: r.book.page_count_estimate }))
    .sort((a, b) => (a.first_published_year ?? 0) - (b.first_published_year ?? 0));
  return { author, books };
}

export { authorLine };
