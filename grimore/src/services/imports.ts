import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import type { ReadingStatus } from './library';

export type ImportRow = {
  title: string;
  authors: string[];
  isbn?: string;
  pages?: number;
  year?: number;
  status: ReadingStatus;
  rating?: number;
  finishedOn?: string;
  /** 0-100, for books in progress (Kobo). */
  percent?: number;
};

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const cleanIsbn = (v?: string) => {
  const d = (v ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
  return d.length === 10 || d.length === 13 ? d : undefined;
};
const num = (v?: string) => {
  const n = Number((v ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const isoDate = (v?: string) => {
  const t = (v ?? '').trim().replace(/\//g, '-');
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : undefined;
};

function statusFrom(value: string): ReadingStatus {
  const v = value.toLowerCase();
  if (v.includes('currently')) return 'reading';
  if (v.includes('did-not-finish') || v.includes('dnf')) return 'dnf';
  if (v === 'read') return 'read';
  return 'want_to_read';
}

/** Understands Goodreads and StoryGraph library exports. */
export function rowsFromExport(text: string): { source: 'goodreads' | 'storygraph' | 'unknown'; rows: ImportRow[] } {
  const [header, ...data] = parseCsv(text);
  if (!header) return { source: 'unknown', rows: [] };
  const h = header.map((x) => x.trim().toLowerCase());
  const col = (...names: string[]) => names.map((n) => h.indexOf(n)).find((i) => i >= 0) ?? -1;
  const source = h.includes('exclusive shelf') ? 'goodreads' : h.includes('read status') ? 'storygraph' : 'unknown';
  const iTitle = col('title');
  const iAuthor = col('author', 'authors');
  const iExtra = col('additional authors');
  const iIsbn13 = col('isbn13', 'isbn/uid');
  const iIsbn = col('isbn');
  const iPages = col('number of pages');
  const iYear = col('original publication year', 'year published');
  const iShelf = col('exclusive shelf', 'read status');
  const iRating = col('my rating', 'star rating');
  const iDate = col('date read', 'last date read');
  if (iTitle < 0) return { source, rows: [] };
  const rows = data
    .map((r) => {
      const title = (r[iTitle] ?? '').trim();
      const authors = [r[iAuthor], r[iExtra]]
        .flatMap((a) => (a ?? '').split(','))
        .map((a) => a.trim())
        .filter(Boolean);
      const rating = num(r[iRating]);
      return {
        title,
        authors: [...new Set(authors)].slice(0, 4),
        isbn: cleanIsbn(r[iIsbn13]) ?? cleanIsbn(r[iIsbn]),
        pages: num(r[iPages]),
        year: num(r[iYear]),
        status: statusFrom(r[iShelf] ?? ''),
        rating: rating ? Math.min(5, Math.round(rating * 2) / 2) : undefined,
        finishedOn: isoDate(r[iDate]),
      } satisfies ImportRow;
    })
    .filter((r) => r.title.length > 0)
    .slice(0, 2000);
  return { source, rows };
}

/**
 * Creates (or reuses) catalogue records and adds them to the reader's library.
 * With `overwrite: false`, books already in the library keep their status.
 * Returns how many were added and each title's (lower-cased) book id.
 */
export async function importRows(userId: string, rows: ImportRow[], onProgress?: (done: number) => void, { overwrite = true }: { overwrite?: boolean } = {}) {
  let done = 0;
  let added = 0;
  const ids = new Map<string, string>();
  for (const r of rows) {
    try {
      const bookId = unwrap(
        await supabase.rpc('upsert_book', {
          p_book: {
            title: r.title,
            authors: r.authors,
            first_published_year: r.year ?? null,
            page_count: r.pages ?? null,
            identifiers: r.isbn ? [{ type: r.isbn.length === 13 ? 'isbn_13' : 'isbn_10', value: r.isbn }] : [],
          },
        }),
      );
      ids.set(r.title.toLowerCase(), bookId as string);
      unwrap(
        await supabase.from('user_books').upsert(
          {
            user_id: userId,
            book_id: bookId,
            status: r.status,
            rating: r.rating ?? null,
            finished_on: r.status === 'read' ? r.finishedOn ?? null : null,
            ...(r.percent != null && r.status === 'reading' ? { progress_percent: Math.max(0, Math.min(100, Math.round(r.percent))) } : {}),
          },
          { onConflict: 'user_id,book_id', ignoreDuplicates: !overwrite },
        ),
      );
      added++;
    } catch {
      // Skip rows the catalogue rejects; the summary reports how many made it.
    }
    done++;
    onProgress?.(done);
  }
  return { added, ids };
}
