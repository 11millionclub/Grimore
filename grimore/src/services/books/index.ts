import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';

import { googleBooks } from './google-books';
import { isValidIsbn, mergeResults, toUpsertPayload } from './normalize';
import { openLibrary } from './open-library';
import type { BookProvider, ExternalBook } from './types';

export type { ExternalBook } from './types';

/** Ordered by preference. Swap or add providers here without touching screens. */
const providers: BookProvider[] = [openLibrary, googleBooks];

/**
 * Search every provider in parallel. One provider failing (rate limit,
 * outage) never breaks search: we return whatever the others found.
 */
export async function searchExternal(query: string, signal?: AbortSignal): Promise<ExternalBook[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (isValidIsbn(q)) {
    const hits = await Promise.allSettled(providers.map((p) => p.byIsbn(q, signal)));
    return mergeResults(hits.map((h) => (h.status === 'fulfilled' && h.value ? [h.value] : [])));
  }
  const settled = await Promise.allSettled(providers.map((p) => p.search(q, signal)));
  const lists = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
  if (settled.every((s) => s.status === 'rejected')) {
    throw new Error('Book search is unavailable right now.');
  }
  return mergeResults(lists);
}

/** Import an external result into the shared catalogue (deduplicated server-side). */
export async function importBook(book: ExternalBook): Promise<string> {
  return unwrap(await supabase.rpc('upsert_book', { p_book: toUpsertPayload(book) }));
}

/** Create a book that no provider knows about. */
export async function createManualBook(input: { title: string; authors: string[]; year?: number; pageCount?: number; isbn?: string }) {
  return unwrap(
    await supabase.rpc('upsert_book', {
      p_book: {
        title: input.title,
        authors: input.authors,
        first_published_year: input.year ?? null,
        page_count: input.pageCount ?? null,
        identifiers: input.isbn ? [{ type: input.isbn.length === 13 ? 'isbn_13' : 'isbn_10', value: input.isbn }] : [],
      },
    }),
  );
}
