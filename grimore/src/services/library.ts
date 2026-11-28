import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { authorLine } from './catalogue';

export type ReadingStatus = Database['public']['Enums']['reading_status'];

export const STATUS_META: Record<ReadingStatus, { label: string; short: string }> = {
  want_to_read: { label: 'TBR', short: 'TBR' },
  reading: { label: 'Reading', short: 'Reading' },
  read: { label: 'Finished', short: 'Finished' },
  on_hold: { label: 'Paused', short: 'Paused' },
  dnf: { label: 'DNF', short: 'DNF' },
};
/** Want-to-read books you own are your TBR; the ones you don't (yet) are your Wishlist. */
export const entryLabel = (e: Pick<LibraryEntry, 'status' | 'is_owned'>) => (e.status === 'want_to_read' && !e.is_owned ? 'Wishlist' : STATUS_META[e.status].label);

/** Status shelves plus the virtual ones: owned, priority, TBR (owned) and Wishlist (not owned). */
export type ShelfStatus = ReadingStatus | 'owned' | 'priority' | 'tbr' | 'wishlist';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onShelf<Q extends { eq: (c: string, v: any) => Q; in: (c: string, v: any[]) => Q }>(q: Q, status: ShelfStatus): Q {
  if (status === 'owned') return q.eq('is_owned', true).in('status', ['want_to_read', 'reading', 'read']);
  if (status === 'priority') return q.eq('status', 'want_to_read').eq('is_priority', true);
  if (status === 'tbr') return q.eq('status', 'want_to_read').eq('is_owned', true);
  if (status === 'wishlist') return q.eq('status', 'want_to_read').eq('is_owned', false);
  return q.eq('status', status);
}

export const STATUS_ORDER: ReadingStatus[] = ['reading', 'want_to_read', 'read', 'on_hold', 'dnf'];

export type LibrarySort = 'updated' | 'added' | 'title' | 'rating';
export const PAGE_SIZE = 30;

const entrySelect = `id, status, format, rating, spice, is_priority, minutes_read, progress_percent, current_page, started_on, finished_on, notes, is_private, is_owned, added_at, updated_at,
  book:books!user_books_book_id_fkey!inner(id, title, cover_url, first_published_year, page_count_estimate, normalized_title, primary_genre_id, book_authors(position, role, authors(name)))` as const;

export type ReadingFormat = 'print' | 'ebook' | 'audio';
export const FORMATS: { id: ReadingFormat; label: string }[] = [
  { id: 'print', label: 'Print' },
  { id: 'ebook', label: 'Ebook' },
  { id: 'audio', label: 'Audiobook' },
];

type RawEntry = {
  id: string;
  status: ReadingStatus;
  format: ReadingFormat;
  rating: number | null;
  spice: number | null;
  is_priority: boolean;
  minutes_read: number;
  progress_percent: number | null;
  current_page: number | null;
  started_on: string | null;
  finished_on: string | null;
  notes: string | null;
  is_private: boolean;
  is_owned: boolean;
  added_at: string;
  updated_at: string;
  book: {
    id: string;
    title: string;
    cover_url: string | null;
    first_published_year: number | null;
    page_count_estimate: number | null;
    primary_genre_id: number | null;
    book_authors: { position: number; role: string; authors: { name: string } | null }[];
  };
};

export type LibraryEntry = Omit<RawEntry, 'book'> & { book: Omit<RawEntry['book'], 'book_authors'> & { authors: string } };

function mapEntry(e: RawEntry): LibraryEntry {
  const { book_authors, ...book } = e.book;
  return { ...e, rating: e.rating === null ? null : Number(e.rating), book: { ...book, authors: authorLine(book_authors) } };
}

export async function listLibrary(opts: {
  userId: string;
  status?: ReadingStatus | 'all';
  search?: string;
  sort?: LibrarySort;
  page?: number;
}): Promise<{ items: LibraryEntry[]; nextPage: number | null }> {
  const page = opts.page ?? 0;
  let q = supabase.from('user_books').select(entrySelect).eq('user_id', opts.userId);
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const term = opts.search?.trim().toLowerCase();
  if (term) q = q.ilike('book.normalized_title', `%${term.replace(/[%_]/g, '')}%`);
  switch (opts.sort ?? 'updated') {
    case 'added':
      q = q.order('added_at', { ascending: false });
      break;
    case 'rating':
      q = q.order('rating', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false });
      break;
    case 'title':
      q = q.order('book(normalized_title)' as 'updated_at', { ascending: true });
      break;
    default:
      q = q.order('updated_at', { ascending: false });
  }
  const rows = unwrap(await q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)) as unknown as RawEntry[];
  return { items: rows.map(mapEntry), nextPage: rows.length === PAGE_SIZE ? page + 1 : null };
}

export async function getStatusCounts(userId: string): Promise<Record<ReadingStatus | 'all', number>> {
  const rows = unwrap(await supabase.from('user_books').select('status').eq('user_id', userId).limit(5000));
  const counts = { all: rows.length, want_to_read: 0, reading: 0, read: 0, on_hold: 0, dnf: 0 };
  rows.forEach((r) => {
    counts[r.status] += 1;
  });
  return counts;
}

export async function getEntry(userId: string, bookId: string): Promise<LibraryEntry | null> {
  const row = unwrap(await supabase.from('user_books').select(entrySelect).eq('user_id', userId).eq('book_id', bookId).maybeSingle());
  return row ? mapEntry(row as unknown as RawEntry) : null;
}

export type EntryPatch = Partial<Pick<LibraryEntry, 'format' | 'status' | 'rating' | 'spice' | 'is_priority' | 'minutes_read' | 'progress_percent' | 'current_page' | 'notes' | 'started_on' | 'finished_on' | 'is_private' | 'is_owned'>>;

export async function saveEntry(userId: string, bookId: string, patch: EntryPatch) {
  return unwrap(
    await supabase
      .from('user_books')
      .upsert({ user_id: userId, book_id: bookId, ...patch }, { onConflict: 'user_id,book_id' })
      .select('id')
      .single(),
  );
}

const utcToday = () => new Date().toISOString().slice(0, 10);

/**
 * A patch that moves a book to `status` and keeps its dates valid. The
 * database requires finished_on >= started_on, so starting a book you have
 * already finished begins a fresh read instead of keeping the old dates.
 */
export function statusPatch(status: ReadingStatus, current?: Pick<LibraryEntry, 'status' | 'started_on' | 'finished_on'> | null): EntryPatch {
  const base = statusPatchInner(status, current);
  // Priority only means something inside the TBR.
  return status === 'want_to_read' ? base : { ...base, is_priority: false };
}

function statusPatchInner(status: ReadingStatus, current?: Pick<LibraryEntry, 'status' | 'started_on' | 'finished_on'> | null): EntryPatch {
  const today = utcToday();
  if (status === 'reading') {
    const rereading = !!current && (current.status === 'read' || !!current.finished_on);
    if (rereading) return { status, started_on: today, finished_on: null, current_page: 0, progress_percent: 0 };
    return current?.started_on ? { status } : { status, started_on: today };
  }
  if (status === 'read') {
    const started = current?.started_on && current.started_on > today ? today : undefined;
    return { status, finished_on: today, progress_percent: 100, ...(started ? { started_on: started } : {}) };
  }
  return { status };
}

/** Move a book to a reading status, reading the current entry first so dates stay coherent. */
export async function setStatus(userId: string, bookId: string, status: ReadingStatus, extra: EntryPatch = {}) {
  const current = await getEntry(userId, bookId);
  return saveEntry(userId, bookId, { ...statusPatch(status, current), ...extra });
}

export async function removeEntry(userId: string, bookId: string) {
  unwrap(await supabase.from('user_books').delete().eq('user_id', userId).eq('book_id', bookId));
}

export async function getGoal(userId: string, year: number) {
  return unwrap(await supabase.from('reading_goals').select('id, target_books, year').eq('user_id', userId).eq('year', year).maybeSingle());
}

export async function setGoal(userId: string, year: number, target: number) {
  unwrap(await supabase.from('reading_goals').upsert({ user_id: userId, year, target_books: target }, { onConflict: 'user_id,year' }));
}

/** Books finished in a given calendar year (for goal progress). */
export async function countReadInYear(userId: string, year: number): Promise<number> {
  const { count, error } = await supabase
    .from('user_books')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'read')
    .gte('finished_on', `${year}-01-01`)
    .lte('finished_on', `${year}-12-31`);
  if (error) throw error;
  return count ?? 0;
}

export type NextReadCandidate = {
  book: { id: string; title: string; cover_url: string | null; authors: string; page_count_estimate: number | null };
  reason: string;
  score: number;
};

/**
 * "What should I read next?" from the reader's own unread shelves (Want to
 * Read + On Hold). A transparent heuristic for now: favourite-genre matches
 * first, then shorter books, then the ones waiting longest. Every pick says
 * why it was chosen. Collaborative "readers like you" ranking comes later.
 */
export async function getNextReads(userId: string, favouriteGenreIds: number[], genreNames: Record<number, string>, limit = 6): Promise<NextReadCandidate[]> {
  const rows = unwrap(
    await supabase
      .from('user_books')
      .select('added_at, status, book:books!user_books_book_id_fkey!inner(id, title, cover_url, page_count_estimate, primary_genre_id, book_authors(position, role, authors(name)))')
      .eq('user_id', userId)
      .in('status', ['want_to_read', 'on_hold'])
      .order('added_at', { ascending: true })
      .limit(200),
  ) as unknown as {
    added_at: string;
    status: ReadingStatus;
    book: { id: string; title: string; cover_url: string | null; page_count_estimate: number | null; primary_genre_id: number | null; book_authors: Parameters<typeof authorLine>[0] };
  }[];

  const now = Date.now();
  return rows
    .map((r, i) => {
      const genreMatch = r.book.primary_genre_id !== null && favouriteGenreIds.includes(r.book.primary_genre_id);
      const short = !!r.book.page_count_estimate && r.book.page_count_estimate < 300;
      const monthsWaiting = Math.floor((now - Date.parse(r.added_at)) / (30 * 86_400_000));
      const score = (genreMatch ? 3 : 0) + (short ? 1 : 0) + Math.min(2, monthsWaiting / 6) + (r.status === 'on_hold' ? 0.5 : 0) - i * 0.001;
      const reason = genreMatch
        ? `You love ${genreNames[r.book.primary_genre_id!]?.toLowerCase() ?? 'this genre'}`
        : r.status === 'on_hold'
          ? 'You paused this one'
          : short
            ? `A short read · ${r.book.page_count_estimate} pages`
            : monthsWaiting >= 2
              ? `Waiting ${monthsWaiting} months on your shelf`
              : 'Recently added to your shelf';
      const { book_authors, primary_genre_id: _g, ...book } = r.book;
      return { book: { ...book, authors: authorLine(book_authors) }, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** A whole status shelf, fetched 1000 at a time (the API returns at most 1000 rows per request). */
export async function listAllByStatus(userId: string, status: ShelfStatus, max = 10_000): Promise<LibraryEntry[]> {
  const out: LibraryEntry[] = [];
  for (let from = 0; from < max; from += 1000) {
    let q = supabase.from('user_books').select(entrySelect).eq('user_id', userId);
    q = onShelf(q, status);
    if (status === 'want_to_read' || status === 'tbr' || status === 'wishlist') q = q.order('is_priority', { ascending: false });
    const rows = unwrap(await q.order('updated_at', { ascending: false }).order('id').range(from, from + 999)) as unknown as RawEntry[];
    out.push(...rows.map(mapEntry));
    if (rows.length < 1000) break;
  }
  return out;
}

/** Exact number of entries on a status shelf (lists are capped; counts are not). */
export async function countByStatus(userId: string, status: ShelfStatus): Promise<number> {
  let q = supabase.from('user_books').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  q = onShelf(q, status);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/**
 * All entries of one status (for shelves and pickers), newest first. In the
 * TBR, priority books come first; 'priority' lists only those.
 */
export async function listByStatus(userId: string, status: ShelfStatus, limit = 200): Promise<LibraryEntry[]> {
  let q = supabase.from('user_books').select(entrySelect).eq('user_id', userId);
  q = onShelf(q, status);
  if (status === 'want_to_read' || status === 'tbr' || status === 'wishlist') q = q.order('is_priority', { ascending: false });
  const rows = unwrap(await q.order('updated_at', { ascending: false }).limit(limit)) as unknown as RawEntry[];
  return rows.map(mapEntry);
}

/** Log the page you are on. Records a reading session, updates progress, optionally posts. */
export async function logProgress(input: { bookId: string; page: number; note?: string; share?: boolean; audience?: 'public' | 'followers' }) {
  return unwrap(
    await supabase.rpc('log_progress', {
      p_book: input.bookId,
      p_page: Math.max(0, Math.round(input.page)),
      p_note: input.note?.trim() || undefined,
      p_share: input.share ?? false,
      p_audience: input.audience ?? 'public',
    }),
  ) as { user_book_id: string; page: number; total: number | null; pages_logged: number; post_id: string | null };
}

/** How far into a book: pages for print, percent for ebooks and audiobooks. */
export function progressOf(e: Pick<LibraryEntry, 'format' | 'current_page' | 'progress_percent'> & { book: { page_count_estimate: number | null } }) {
  const total = e.book.page_count_estimate;
  if (e.format && e.format !== 'print') {
    const pct = (e.progress_percent ?? 0) / 100;
    return { pct, label: `${e.format === 'audio' ? 'Audiobook' : 'Ebook'} · ${Math.round(pct * 100)}%` };
  }
  const page = e.current_page ?? 0;
  return { pct: total ? page / total : (e.progress_percent ?? 0) / 100, label: total ? `p. ${page} of ${total}` : `p. ${page}` };
}

/** Progress as a percentage (ebooks and audiobooks); the page follows when the length is known. */
export async function logProgressPercent(input: { bookId: string; percent: number; note?: string }) {
  return unwrap(
    await supabase.rpc('log_progress_percent', { p_book: input.bookId, p_percent: Math.max(0, Math.min(100, Math.round(input.percent))), p_note: input.note?.trim() || undefined }),
  ) as { user_book_id: string; percent: number; page: number | null; total: number | null; percent_logged: number; post_id: string | null };
}

export type Streak = { current: number; longest: number; today_pages: number; daily_goal: number; week: { date: string; pages: number }[] };

export async function getReadingStreak(userId?: string): Promise<Streak> {
  return unwrap(await supabase.rpc('get_reading_streak', userId ? { p_user: userId } : {})) as unknown as Streak;
}

/** Add many books at once (shelf scan, imports). Existing entries keep their status unless `overwrite`. */
export async function addMany(userId: string, bookIds: string[], patch: EntryPatch, overwrite = false) {
  if (!bookIds.length) return 0;
  const existing = unwrap(await supabase.from('user_books').select('book_id').eq('user_id', userId).in('book_id', bookIds));
  const have = new Set(existing.map((e) => e.book_id));
  const fresh = bookIds.filter((id) => !have.has(id));
  if (fresh.length) unwrap(await supabase.from('user_books').insert(fresh.map((book_id) => ({ user_id: userId, book_id, status: 'want_to_read' as ReadingStatus, ...patch }))));
  const old = bookIds.filter((id) => have.has(id));
  if (old.length) {
    const update: EntryPatch = overwrite ? patch : patch.is_owned ? { is_owned: true } : {};
    if (Object.keys(update).length) unwrap(await supabase.from('user_books').update(update).eq('user_id', userId).in('book_id', old));
  }
  return bookIds.length;
}

/* ---------- Custom shelves (reading lists) ---------- */

export type Shelf = { id: string; title: string; description: string | null; is_public: boolean; count: number; covers: { id: string; title: string; cover_url: string | null }[] };

export async function listShelves(userId: string): Promise<Shelf[]> {
  const rows = unwrap(
    await supabase
      .from('reading_lists')
      .select('id, title, description, is_public, reading_list_books(position, book:books!reading_list_books_book_id_fkey(id, title, cover_url))')
      .eq('user_id', userId)
      .order('position'),
  ) as unknown as { id: string; title: string; description: string | null; is_public: boolean; reading_list_books: { position: number; book: { id: string; title: string; cover_url: string | null } | null }[] }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    is_public: r.is_public,
    count: r.reading_list_books.length,
    covers: r.reading_list_books
      .sort((a, b) => a.position - b.position)
      .map((x) => x.book)
      .filter((b): b is NonNullable<typeof b> => !!b)
      .slice(0, 3),
  }));
}

export async function createShelf(userId: string, title: string, isPublic: boolean) {
  return unwrap(await supabase.from('reading_lists').insert({ user_id: userId, title: title.trim(), is_public: isPublic }).select('id').single());
}

export async function getShelfBooks(listId: string) {
  const rows = unwrap(
    await supabase
      .from('reading_list_books')
      .select('position, book:books!reading_list_books_book_id_fkey(id, title, cover_url, first_published_year, book_authors(position, role, authors(name)))')
      .eq('list_id', listId)
      .order('position'),
  ) as unknown as { book: { id: string; title: string; cover_url: string | null; first_published_year: number | null; book_authors: Parameters<typeof authorLine>[0] } | null }[];
  return rows.filter((r) => r.book).map((r) => ({ id: r.book!.id, title: r.book!.title, cover_url: r.book!.cover_url, authors: authorLine(r.book!.book_authors) }));
}

export async function addToShelf(listId: string, bookId: string) {
  unwrap(await supabase.from('reading_list_books').upsert({ list_id: listId, book_id: bookId, position: Date.now() % 1_000_000 }, { onConflict: 'list_id,book_id', ignoreDuplicates: true }));
}

/* ---------- Quotes ---------- */

export async function listQuotes(userId: string) {
  return unwrap(
    await supabase.from('user_quotes').select('id, body, attribution, book_id, created_at, book:books!user_quotes_book_id_fkey(id, title, cover_url)').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
  ) as unknown as { id: string; body: string; attribution: string | null; book_id: string | null; created_at: string; book: { id: string; title: string; cover_url: string | null } | null }[];
}

export async function saveQuote(userId: string, input: { body: string; bookId?: string | null; attribution?: string | null }) {
  return unwrap(
    await supabase
      .from('user_quotes')
      .insert({ user_id: userId, body: input.body.trim().slice(0, 1000), book_id: input.bookId ?? null, attribution: input.attribution ?? null, position: 0 })
      .select('id')
      .single(),
  );
}

export async function removeFromShelf(listId: string, bookId: string) {
  unwrap(await supabase.from('reading_list_books').delete().eq('list_id', listId).eq('book_id', bookId));
}

/** Ids of the reader's own shelves that hold this book. */
export async function shelvesWithBook(userId: string, bookId: string): Promise<string[]> {
  const rows = unwrap(await supabase.from('reading_list_books').select('list_id, reading_lists!inner(user_id)').eq('book_id', bookId).eq('reading_lists.user_id', userId));
  return rows.map((r) => r.list_id);
}

/** Whether a custom shelf belongs to this reader. */
export async function isMyShelf(userId: string, listId: string) {
  return !!unwrap(await supabase.from('reading_lists').select('id').eq('id', listId).eq('user_id', userId).maybeSingle());
}

/** Save a timed reading session; its minutes are added to the book's reading time. */
export async function logReadingSession(bookId: string | null, seconds: number) {
  const [row] = (unwrap(await supabase.rpc('log_reading_session', { p_book: bookId as string, p_seconds: Math.round(seconds) })) ?? []) as { minutes_today: number; minutes_book: number | null }[];
  return { minutesToday: row?.minutes_today ?? 0, minutesBook: row?.minutes_book ?? null };
}

/** Every entry in a reader's library (all statuses), 1000 rows per request. */
export async function listWholeLibrary(userId: string, max = 20_000): Promise<LibraryEntry[]> {
  const out: LibraryEntry[] = [];
  for (let from = 0; from < max; from += 1000) {
    const rows = unwrap(await supabase.from('user_books').select(entrySelect).eq('user_id', userId).order('updated_at', { ascending: false }).order('id').range(from, from + 999)) as unknown as RawEntry[];
    out.push(...rows.map(mapEntry));
    if (rows.length < 1000) break;
  }
  return out;
}
