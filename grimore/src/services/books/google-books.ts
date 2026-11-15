import { env } from '@/lib/env';

import { cleanIsbn } from './normalize';
import type { BookProvider, ExternalBook } from './types';

/**
 * Google Books: strong coverage of recent and non-English editions.
 * Works without a key at low volume; set EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY
 * (an API key restricted to the Books API and your app) for production.
 */
const BASE = 'https://www.googleapis.com/books/v1/volumes';

type Volume = {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    publisher?: string;
    language?: string;
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

export function mapVolume(v: Volume): ExternalBook | null {
  const info = v.volumeInfo;
  if (!info.title) return null;
  const ids = info.industryIdentifiers ?? [];
  const year = info.publishedDate ? Number.parseInt(info.publishedDate.slice(0, 4), 10) : undefined;
  const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  return {
    source: 'google_books',
    sourceId: v.id,
    googleVolumeId: v.id,
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors ?? [],
    // Google reports the edition date, not first publication; used only as a fallback.
    firstPublishedYear: Number.isFinite(year) ? year : undefined,
    pageCount: info.pageCount && info.pageCount > 0 ? info.pageCount : undefined,
    coverUrl: thumb ? thumb.replace('http://', 'https://').replace('&edge=curl', '') : undefined,
    isbn13: ids.find((i) => i.type === 'ISBN_13')?.identifier,
    isbn10: ids.find((i) => i.type === 'ISBN_10')?.identifier,
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    language: info.language,
    description: info.description,
  };
}

async function query(q: string, max: number, signal?: AbortSignal): Promise<ExternalBook[]> {
  const key = env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY ? `&key=${env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY}` : '';
  const res = await fetch(`${BASE}?q=${encodeURIComponent(q)}&maxResults=${max}&printType=books${key}`, { signal });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const data = (await res.json()) as { items?: Volume[] };
  return (data.items ?? []).map(mapVolume).filter((b): b is ExternalBook => b !== null);
}

export const googleBooks: BookProvider = {
  id: 'google_books',
  search: (q, signal) => query(q, 20, signal),
  async byIsbn(isbn, signal) {
    const results = await query(`isbn:${cleanIsbn(isbn)}`, 1, signal);
    return results[0] ?? null;
  },
};
