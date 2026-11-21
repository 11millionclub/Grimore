/**
 * Kindle and Kobo imports.
 *
 * Neither Amazon nor Kobo offers an API or sign-in for third-party apps, so
 * an account cannot be "linked". What both devices do give the reader is a
 * file: Kindle keeps every highlight in `documents/My Clippings.txt`, and Kobo
 * keeps the whole library (status, progress, highlights) in
 * `.kobo/KoboReader.sqlite`. Plug the e-reader into a computer, or send the
 * file to your phone, and pick it here.
 */
import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { importRows, type ImportRow } from './imports';

export type Highlight = { title: string; author: string; text: string };
export type EreaderExport = { books: ImportRow[]; highlights: Highlight[] };

const QUOTE_MAX = 600;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** "Morrison, Toni" -> "Toni Morrison"; leaves "Toni Morrison" alone. */
export function readableAuthor(a: string) {
  const t = a.trim();
  const m = /^([^,]+),\s*([^,]+)$/.exec(t);
  return m ? `${m[2].trim()} ${m[1].trim()}` : t;
}

/** Splits the Kindle header line "Title (Author; Other Author)". */
function splitKindleHeader(line: string) {
  const t = line.replace(/^﻿/, '').trim();
  const m = /^(.*)\(([^()]*)\)\s*$/.exec(t);
  if (!m || !m[1].trim()) return { title: t, authors: [] as string[] };
  const authors = m[2]
    .split(/;|&| and /)
    .map(readableAuthor)
    .filter(Boolean);
  return { title: m[1].trim(), authors };
}

/**
 * Parses Kindle's "My Clippings.txt". Works for every device language, since
 * it relies on the file's layout rather than its words: a header line, a
 * metadata line, a blank line, the text, then "==========". Bookmarks (no
 * text) are skipped; when a highlight was extended, Kindle writes it again,
 * so a highlight contained in a later one from the same book is dropped.
 */
export function parseKindleClippings(text: string): EreaderExport {
  if (!/^={8,}\s*$/m.test(text)) return { books: [], highlights: [] };
  const entries = text.replace(/\r\n?/g, '\n').split(/\n?={8,}\n?/);
  const books = new Map<string, ImportRow>();
  const byBook = new Map<string, string[]>();
  for (const raw of entries) {
    const lines = raw.split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    if (lines.length < 3 || !lines[1].trim().startsWith('-')) continue;
    const { title, authors } = splitKindleHeader(lines[0]);
    const body = lines.slice(2).join('\n').trim().replace(/\s+/g, ' ');
    if (!title) continue;
    const key = title.toLowerCase();
    if (!books.has(key)) books.set(key, { title: clip(title, 300), authors: authors.slice(0, 4), status: 'read' });
    if (!body) continue;
    const list = byBook.get(key) ?? [];
    // Drop earlier versions of an extended highlight, and exact repeats.
    const kept = list.filter((b) => !body.includes(b));
    if (!kept.some((b) => b.includes(body))) kept.push(body);
    byBook.set(key, kept);
  }
  const highlights: Highlight[] = [];
  for (const [key, list] of byBook) {
    const b = books.get(key)!;
    for (const t of list) highlights.push({ title: b.title, author: b.authors[0] ?? '', text: clip(t, QUOTE_MAX) });
  }
  return { books: [...books.values()].slice(0, 2000), highlights: highlights.slice(0, 2000) };
}

/** Sends KoboReader.sqlite to the `kobo-import` Edge Function, which reads it and returns books and highlights. */
export async function readKoboDatabase(file: Blob): Promise<EreaderExport> {
  const { data, error } = await supabase.functions.invoke('kobo-import', { body: file, headers: { 'Content-Type': 'application/octet-stream' } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const code = ctx && typeof ctx.json === 'function' ? ((await ctx.json().catch(() => ({}))) as { error?: string }).error : undefined;
    throw new Error(
      code === 'not_a_kobo_database'
        ? 'That file is not a Kobo library. Pick .kobo/KoboReader.sqlite from the e-reader.'
        : code === 'too_large'
          ? 'That file is too large to import.'
          : 'Could not read the Kobo library. Please try again.',
    );
  }
  const d = data as { books?: ImportRow[]; highlights?: Highlight[] };
  return { books: d.books ?? [], highlights: (d.highlights ?? []).map((h) => ({ ...h, text: clip(h.text, QUOTE_MAX) })) };
}

/**
 * Adds the books (Kindle: never changes a book already in the library; Kobo:
 * updates status and progress from the device) and saves the highlights as
 * quotes, skipping ones already saved.
 */
export async function importEreader(
  userId: string,
  data: EreaderExport,
  opts: { overwrite: boolean },
  onProgress?: (done: number, total: number) => void,
) {
  const total = data.books.length + (data.highlights.length ? 1 : 0);
  const { added, ids } = await importRows(userId, data.books, (done) => onProgress?.(done, total), opts);
  let quotes = 0;
  if (data.highlights.length) {
    const existing = unwrap(await supabase.from('user_quotes').select('body').eq('user_id', userId).limit(5000)) as { body: string }[];
    const seen = new Set(existing.map((q) => q.body));
    const rows = data.highlights
      .filter((h) => h.text && !seen.has(h.text) && (seen.add(h.text), true))
      .map((h) => ({
        user_id: userId,
        body: h.text,
        attribution: clip([h.author, h.title].filter(Boolean).join(', '), 160) || null,
        book_id: ids.get(h.title.toLowerCase()) ?? null,
      }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('user_quotes').insert(rows.slice(i, i + 200));
      if (!error) quotes += Math.min(200, rows.length - i);
    }
    onProgress?.(total, total);
  }
  return { books: added, quotes };
}
