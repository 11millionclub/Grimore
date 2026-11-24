/**
 * Groups books into sagas for the library shelves. Imported titles often
 * carry the series, e.g. "Heir of Fire (Throne of Glass, #3)" or
 * "Fourth Wing #1"; books without one are grouped by their first author.
 */
export type SagaBook = { id: string; title: string; authors?: string | null; year?: number | null; pages?: number | null };

const SERIES_IN_PARENS = /\(([^()#]+?),?\s*#\s*(\d+(?:\.\d+)?)\)\s*$/;
const SERIES_HASH = /^(.*?)\s*#\s*(\d+(?:\.\d+)?)\s*$/;

export function parseSeries(title: string): { series: string; index: number; clean: string } | null {
  const p = SERIES_IN_PARENS.exec(title);
  if (p) return { series: p[1].trim(), index: Number(p[2]), clean: title.slice(0, p.index).trim() };
  const h = SERIES_HASH.exec(title);
  if (h && h[1]) return { series: h[1].trim(), index: Number(h[2]), clean: title };
  return null;
}

/** The title without its "(Series, #n)" suffix, for spines. */
export const spineTitle = (title: string) => parseSeries(title)?.clean ?? title;

export type Saga<T extends SagaBook> = { key: string; name: string; books: T[] };

/** Sagas (largest first), each in reading order; authors without a named series form their own group. */
export function groupSagas<T extends SagaBook>(books: T[]): Saga<T>[] {
  const groups = new Map<string, { name: string; items: { b: T; i: number }[] }>();
  for (const b of books) {
    const s = parseSeries(b.title);
    const author = (b.authors ?? '').split(',')[0].trim();
    const key = s ? `s:${s.series.toLowerCase()}` : `a:${author.toLowerCase() || b.id}`;
    const g = groups.get(key) ?? { name: s?.series ?? (author || b.title), items: [] };
    g.items.push({ b, i: s?.index ?? (b.year ?? 9999) });
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, name: g.name, books: g.items.sort((x, y) => x.i - y.i || x.b.title.localeCompare(y.b.title)).map((x) => x.b) }))
    .sort((a, b) => b.books.length - a.books.length || a.name.localeCompare(b.name));
}

/** A stable small number from a string (colours and heights that do not jump between renders). */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
