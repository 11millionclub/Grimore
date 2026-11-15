import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { authorLine } from './catalogue';

export type ReadingStatus = Database['public']['Enums']['reading_status'];

export const STATUS_META: Record<ReadingStatus, { label: string; short: string; icon: 'bookmark' | 'book-open' | 'check' | 'pause' | 'x' }> = {
  want_to_read: { label: 'Want to Read', short: 'Want', icon: 'bookmark' },
  reading: { label: 'Currently Reading', short: 'Reading', icon: 'book-open' },
  read: { label: 'Read', short: 'Read', icon: 'check' },
  on_hold: { label: 'On Hold', short: 'On hold', icon: 'pause' },
  dnf: { label: 'Did Not Finish', short: 'DNF', icon: 'x' },
};
export const STATUS_ORDER: ReadingStatus[] = ['reading', 'want_to_read', 'read', 'on_hold', 'dnf'];

export type LibrarySort = 'updated' | 'added' | 'title' | 'rating';
export const PAGE_SIZE = 30;

const entrySelect = `id, status, rating, progress_percent, current_page, started_on, finished_on, notes, is_private, added_at, updated_at,
  book:books!inner(id, title, cover_url, first_published_year, page_count_estimate, normalized_title, book_authors(position, role, authors(name)))` as const;

type RawEntry = {
  id: string;
  status: ReadingStatus;
  rating: number | null;
  progress_percent: number | null;
  current_page: number | null;
  started_on: string | null;
  finished_on: string | null;
  notes: string | null;
  is_private: boolean;
  added_at: string;
  updated_at: string;
  book: {
    id: string;
    title: string;
    cover_url: string | null;
    first_published_year: number | null;
    page_count_estimate: number | null;
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

export type EntryPatch = Partial<Pick<LibraryEntry, 'status' | 'rating' | 'progress_percent' | 'current_page' | 'notes' | 'started_on' | 'finished_on' | 'is_private'>>;

export async function saveEntry(userId: string, bookId: string, patch: EntryPatch) {
  return unwrap(
    await supabase
      .from('user_books')
      .upsert({ user_id: userId, book_id: bookId, ...patch }, { onConflict: 'user_id,book_id' })
      .select('id')
      .single(),
  );
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
