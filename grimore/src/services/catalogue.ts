import { AppError, unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type BookSummary = {
  id: string;
  title: string;
  cover_url: string | null;
  first_published_year: number | null;
  authors: string;
};

const summarySelect = 'id, title, cover_url, first_published_year, book_authors(position, role, authors(name))' as const;

type RawSummary = {
  id: string;
  title: string;
  cover_url: string | null;
  first_published_year: number | null;
  book_authors: { position: number; role: string; authors: { name: string } | null }[];
};

export function authorLine(rows: RawSummary['book_authors'] | undefined): string {
  return (rows ?? [])
    .filter((r) => r.role === 'author' && r.authors)
    .sort((a, b) => a.position - b.position)
    .map((r) => r.authors!.name)
    .join(', ');
}

export function toSummary(b: RawSummary): BookSummary {
  return { id: b.id, title: b.title, cover_url: b.cover_url, first_published_year: b.first_published_year, authors: authorLine(b.book_authors) };
}

/** Search books already in GriMore (fast, used by games and pickers). */
export async function searchCatalogue(query: string, limit = 20): Promise<BookSummary[]> {
  if (query.trim().length < 2) return [];
  const rows = unwrap(await supabase.rpc('search_catalogue', { p_query: query, p_limit: limit }));
  return rows.map((r) => ({ id: r.id, title: r.title, cover_url: r.cover_url, first_published_year: r.first_published_year, authors: r.authors ?? '' }));
}

/**
 * A book page. The core row comes from one plain query, so the page opens
 * even if a related table (authors, genres, moods) fails to load; those are
 * fetched separately and fall back to empty.
 */
export async function getBook(id: string) {
  const core = unwrap(
    await supabase.from('books').select('id, title, subtitle, description, first_published_year, page_count_estimate, cover_url, primary_genre_id').eq('id', id).maybeSingle(),
  );
  if (!core) throw new AppError('That book is not in the catalogue yet.', 'book_not_found');
  const soft = async <T,>(q: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> => {
    try {
      const r = await q;
      return r.error || r.data == null ? fallback : r.data;
    } catch {
      return fallback;
    }
  };
  const [moods, authors, genres, primary] = await Promise.all([
    soft(supabase.from('books').select('moods').eq('id', id).maybeSingle(), null as { moods: string[] | null } | null),
    soft(supabase.from('book_authors').select('position, role, authors!book_authors_author_id_fkey(id, name, nationality_code)').eq('book_id', id), [] as unknown[]),
    soft(supabase.from('book_genres').select('genres!book_genres_genre_id_fkey(id, name, slug)').eq('book_id', id), [] as unknown[]),
    core.primary_genre_id != null ? soft(supabase.from('genres').select('id, name, slug').eq('id', core.primary_genre_id).maybeSingle(), null) : Promise.resolve(null),
  ]);
  const bookAuthors = authors as RawSummary['book_authors'];
  return {
    ...core,
    moods: moods?.moods ?? [],
    primary_genre: primary as { id: number; name: string; slug: string } | null,
    book_genres: genres as { genres: { id: number; name: string; slug: string } | null }[],
    book_authors: bookAuthors,
    authorsLine: authorLine(bookAuthors),
  };
}

export type BookDetail = Awaited<ReturnType<typeof getBook>>;

/** Curated suggestions, optionally weighted towards the reader's favourite genres. */
export async function getSuggestions(genreIds: number[], excludeIds: string[], limit = 10): Promise<BookSummary[]> {
  let q = supabase.from('books').select(summarySelect).eq('is_curated', true).not('cover_url', 'is', null).limit(40);
  if (genreIds.length) q = q.in('primary_genre_id', genreIds);
  const rows = unwrap(await q) as unknown as RawSummary[];
  const exclude = new Set(excludeIds);
  // Rotate daily so Home feels fresh without being random on every render.
  const day = Math.floor(Date.now() / 86_400_000);
  return rows
    .filter((r) => !exclude.has(r.id))
    .sort((a, b) => ((a.id.charCodeAt(0) + day) % 7) - ((b.id.charCodeAt(0) + day) % 7))
    .slice(0, limit)
    .map(toSummary);
}

export async function getGenres() {
  return unwrap(await supabase.from('genres').select('id, slug, name').order('sort_order'));
}

export async function getBookCommunity(bookId: string) {
  const [readers, reviews] = await Promise.all([
    supabase.from('user_books').select('id', { count: 'exact', head: true }).eq('book_id', bookId),
    supabase.from('reviews').select('rating').eq('book_id', bookId).limit(500),
  ]);
  const ratings = (reviews.data ?? []).map((r) => Number(r.rating));
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return { readers: readers.count ?? 0, reviewCount: ratings.length, average };
}

/** People I follow who have this book, and their average rating. */
export async function friendsWithBook(viewerId: string, bookId: string) {
  const follows = unwrap(await supabase.from('follows').select('followee_id').eq('follower_id', viewerId).eq('status', 'accepted').limit(2000));
  const ids = follows.map((f) => f.followee_id);
  if (!ids.length) return { readers: [] as { id: string; username: string; display_name: string | null; avatar_url: string | null }[], read: 0, avg: null as number | null };
  const rows = unwrap(
    await supabase
      .from('user_books')
      .select('status, rating, who:profiles!user_books_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('book_id', bookId)
      .in('user_id', ids)
      .limit(200),
  ) as unknown as { status: string; rating: number | null; who: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null }[];
  const rated = rows.filter((r) => r.rating !== null);
  return {
    readers: rows.map((r) => r.who).filter((w): w is NonNullable<typeof w> => !!w),
    read: rows.filter((r) => r.status === 'read').length,
    avg: rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : null,
  };
}
