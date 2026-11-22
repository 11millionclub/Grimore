import { cleanIsbn } from './normalize';
import type { BookProvider, ExternalBook } from './types';

/**
 * Open Library (Internet Archive): free, no key, generous licence for
 * bibliographic data; covers served from covers.openlibrary.org.
 * Docs: https://openlibrary.org/dev/docs/api/search
 */
const BASE = 'https://openlibrary.org';
const FIELDS = 'key,title,subtitle,author_name,cover_i,first_publish_year,isbn,number_of_pages_median,language,publisher';

type Doc = {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  language?: string[];
  publisher?: string[];
};

export function coverUrlFromId(id: number, size: 'S' | 'M' | 'L' = 'L'): string {
  return `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
}

export function mapDoc(d: Doc): ExternalBook {
  const isbns = d.isbn ?? [];
  return {
    source: 'open_library',
    sourceId: d.key,
    title: d.title,
    subtitle: d.subtitle,
    authors: d.author_name ?? [],
    firstPublishedYear: d.first_publish_year,
    pageCount: d.number_of_pages_median,
    coverUrl: d.cover_i ? coverUrlFromId(d.cover_i) : undefined,
    isbn13: isbns.find((i) => i.length === 13),
    isbn10: isbns.find((i) => i.length === 10),
    openLibraryWorkKey: d.key.replace('/works/', ''),
    publisher: d.publisher?.[0],
    language: d.language?.[0],
  };
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  return (await res.json()) as T;
}

export const openLibrary: BookProvider = {
  id: 'open_library',
  async search(query, signal) {
    const q = encodeURIComponent(query.trim());
    const data = await get<{ docs: Doc[] }>(`/search.json?q=${q}&limit=20&fields=${FIELDS}`, signal);
    return data.docs.filter((d) => d.title).map(mapDoc);
  },
  async byIsbn(isbn, signal) {
    const data = await get<{ docs: Doc[] }>(`/search.json?isbn=${cleanIsbn(isbn)}&limit=1&fields=${FIELDS}`, signal);
    const doc = data.docs[0];
    if (!doc) return null;
    return { ...mapDoc(doc), isbn13: cleanIsbn(isbn).length === 13 ? cleanIsbn(isbn) : mapDoc(doc).isbn13 };
  },
};

/**
 * Popular books for a subject, page by page (30 per page), most-shelved
 * first. Used to browse genres beyond Grimore's own catalogue.
 */
export async function searchSubject(subjectQuery: string, page = 1, signal?: AbortSignal): Promise<{ books: ExternalBook[]; total: number }> {
  const q = encodeURIComponent(subjectQuery);
  const data = await get<{ docs: Doc[]; numFound: number }>(`/search.json?q=${q}&sort=readinglog&limit=30&page=${page}&fields=${FIELDS}`, signal);
  return { books: data.docs.filter((d) => d.title && d.cover_i).map(mapDoc), total: data.numFound };
}
