import type { ExternalBook } from './types';

/** Lowercase, strip punctuation and diacritics, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function cleanIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

/** Validates ISBN-10 and ISBN-13 checksums. */
export function isValidIsbn(raw: string): boolean {
  const isbn = cleanIsbn(raw);
  if (isbn.length === 10) {
    let sum = 0;
    for (let i = 0; i < 10; i += 1) {
      const c = isbn[i];
      const v = c === 'X' ? (i === 9 ? 10 : NaN) : Number(c);
      if (Number.isNaN(v)) return false;
      sum += v * (10 - i);
    }
    return sum % 11 === 0;
  }
  if (isbn.length === 13 && /^\d{13}$/.test(isbn)) {
    const sum = isbn
      .split('')
      .map(Number)
      .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  return false;
}

/** Convert a valid ISBN-10 to its ISBN-13 form. */
export function isbn10to13(isbn10: string): string | null {
  const core = cleanIsbn(isbn10);
  if (core.length !== 10 || !isValidIsbn(core)) return null;
  const base = `978${core.slice(0, 9)}`;
  const sum = base
    .split('')
    .map(Number)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (sum % 10)) % 10);
}

function identityKeys(b: ExternalBook): string[] {
  const keys: string[] = [];
  const isbn13 = b.isbn13 ?? (b.isbn10 ? isbn10to13(b.isbn10) ?? undefined : undefined);
  if (isbn13) keys.push(`isbn:${isbn13}`);
  if (b.openLibraryWorkKey) keys.push(`olw:${b.openLibraryWorkKey}`);
  keys.push(`ta:${normalizeTitle(b.title)}|${normalizeTitle(b.authors[0] ?? '')}`);
  return keys;
}

/**
 * Merge results from several providers. Two records are the same *work* when
 * they share an ISBN, an Open Library work key, or an exact normalised
 * title + first author. Earlier providers win; later ones fill gaps
 * (cover, page count, identifiers).
 */
export function mergeResults(lists: ExternalBook[][]): ExternalBook[] {
  const out: ExternalBook[] = [];
  const index = new Map<string, number>();
  for (const list of lists) {
    for (const book of list) {
      const keys = identityKeys(book);
      const existing = keys.map((k) => index.get(k)).find((i) => i !== undefined);
      if (existing === undefined) {
        out.push({ ...book });
        keys.forEach((k) => index.set(k, out.length - 1));
      } else {
        const target = out[existing];
        out[existing] = {
          ...book,
          ...target,
          coverUrl: target.coverUrl ?? book.coverUrl,
          pageCount: target.pageCount ?? book.pageCount,
          isbn13: target.isbn13 ?? book.isbn13,
          isbn10: target.isbn10 ?? book.isbn10,
          googleVolumeId: target.googleVolumeId ?? book.googleVolumeId,
          openLibraryWorkKey: target.openLibraryWorkKey ?? book.openLibraryWorkKey,
          description: target.description ?? book.description,
          firstPublishedYear: minDefined(target.firstPublishedYear, book.firstPublishedYear),
        };
        keys.forEach((k) => index.set(k, existing));
      }
    }
  }
  return out;
}

function minDefined(a?: number, b?: number): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}

/** Payload for public.upsert_book. */
export function toUpsertPayload(b: ExternalBook) {
  const identifiers: { type: string; value: string }[] = [];
  if (b.isbn13) identifiers.push({ type: 'isbn_13', value: b.isbn13 });
  if (b.isbn10) identifiers.push({ type: 'isbn_10', value: b.isbn10 });
  if (b.googleVolumeId) identifiers.push({ type: 'google_volume', value: b.googleVolumeId });
  return {
    title: b.title,
    subtitle: b.subtitle ?? null,
    authors: b.authors.slice(0, 10),
    first_published_year: b.firstPublishedYear ?? null,
    page_count: b.pageCount ?? null,
    cover_url: b.coverUrl ?? null,
    cover_source: b.coverUrl ? b.source : null,
    open_library_work_key: b.openLibraryWorkKey ?? null,
    publisher: b.publisher ?? null,
    published_date: b.publishedDate ?? null,
    language: b.language ?? null,
    description: b.description ?? null,
    identifiers,
  };
}
