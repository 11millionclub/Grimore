import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { authorLine } from './catalogue';

type ReadRow = {
  status: string;
  rating: number | null;
  started_on: string | null;
  finished_on: string | null;
  added_at: string;
  book: {
    id: string;
    title: string;
    cover_url: string | null;
    page_count_estimate: number | null;
    first_published_year: number | null;
    moods: string[];
    primary_genre: { name: string } | null;
    book_authors: Parameters<typeof authorLine>[0];
  };
};

export type LibraryBook = {
  id: string;
  title: string;
  cover_url: string | null;
  authors: string;
  pages: number | null;
  year: number | null;
  genre: string | null;
  moods: string[];
  rating: number | null;
  status: string;
  started_on: string | null;
  finished_on: string | null;
};

type Session = { pages_read: number | null; created_at: string; user_book_id: string };

async function loadAll(userId: string) {
  const [rows, sessions] = await Promise.all([
    supabase
      .from('user_books')
      .select('status, rating, started_on, finished_on, added_at, book:books!user_books_book_id_fkey!inner(id, title, cover_url, page_count_estimate, first_published_year, moods, primary_genre:genres!books_primary_genre_id_fkey(name), book_authors(position, role, authors(name)))')
      .eq('user_id', userId)
      .limit(5000),
    supabase.from('reading_sessions').select('pages_read, created_at, user_book_id').eq('user_id', userId).order('created_at').limit(10000),
  ]);
  const books: LibraryBook[] = (unwrap(rows) as unknown as ReadRow[]).map((r) => ({
    id: r.book.id,
    title: r.book.title,
    cover_url: r.book.cover_url,
    authors: authorLine(r.book.book_authors),
    pages: r.book.page_count_estimate,
    year: r.book.first_published_year ?? null,
    genre: r.book.primary_genre?.name ?? null,
    moods: r.book.moods ?? [],
    rating: r.rating === null ? null : Number(r.rating),
    status: r.status,
    started_on: r.started_on,
    finished_on: r.finished_on,
  }));
  return { books, sessions: (unwrap(sessions) as Session[]) ?? [] };
}

const inRange = (iso: string | null, from: Date, to: Date) => !!iso && Date.parse(iso) >= from.getTime() && Date.parse(iso) < to.getTime();

function share(values: (string | null)[]) {
  const counts = new Map<string, number>();
  values.forEach((v) => v && counts.set(v, (counts.get(v) ?? 0) + 1));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, pct: total ? Math.round((n / total) * 100) : 0, n }));
}

export type ReadingStats = Awaited<ReturnType<typeof getReadingStats>>;

/** Everything the Stats tab, Reader DNA and Wrapped need, computed from the reader's own rows. */
export async function getReadingStats(userId: string, year = new Date().getFullYear()) {
  const { books, sessions } = await loadAll(userId);
  const from = new Date(year, 0, 1);
  const to = new Date(year + 1, 0, 1);
  const finished = books.filter((b) => b.status === 'read' && inRange(b.finished_on, from, to));

  const pagesByMonth = Array.from({ length: 12 }, () => 0);
  sessions.forEach((s) => {
    const d = new Date(s.created_at);
    if (d >= from && d < to) pagesByMonth[d.getMonth()] += s.pages_read ?? 0;
  });
  // Books finished without logged sessions still count their pages in the finishing month.
  if (sessions.length === 0) finished.forEach((b) => (pagesByMonth[new Date(b.finished_on!).getMonth()] += b.pages ?? 0));
  const pages = pagesByMonth.reduce((a, b) => a + b, 0);

  const hours = Array.from({ length: 24 }, () => 0);
  sessions.forEach((s) => (hours[new Date(s.created_at).getHours()] += s.pages_read ?? 0));
  const peakHour = hours.some((h) => h > 0) ? hours.indexOf(Math.max(...hours)) : null;

  const days = new Map<string, number>();
  sessions.forEach((s) => {
    const k = s.created_at.slice(0, 10);
    days.set(k, (days.get(k) ?? 0) + (s.pages_read ?? 0));
  });
  const today = new Date();
  const heat = Array.from({ length: 20 * 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (20 * 7 - 1 - i));
    return days.get(d.toISOString().slice(0, 10)) ?? 0;
  });

  const rated = finished.filter((b) => b.rating !== null);
  const avgRating = rated.length ? rated.reduce((a, b) => a + (b.rating ?? 0), 0) / rated.length : null;
  const dayOfYear = Math.max(1, Math.ceil((Math.min(today.getTime(), to.getTime()) - from.getTime()) / 86_400_000));
  const readAll = books.filter((b) => b.status === 'read');
  const sortedPages = readAll.map((b) => b.pages).filter((p): p is number => !!p).sort((a, b) => a - b);
  const durations = readAll
    .filter((b) => b.started_on && b.finished_on)
    .map((b) => Math.max(1, Math.round((Date.parse(b.finished_on!) - Date.parse(b.started_on!)) / 86_400_000)));

  return {
    year,
    books,
    finished,
    booksRead: finished.length,
    pages,
    pagesPerDay: Math.round(pages / dayOfYear),
    avgRating,
    pagesByMonth,
    bestMonth: pages ? pagesByMonth.indexOf(Math.max(...pagesByMonth)) : null,
    hours,
    peakHour,
    heat,
    genres: share(finished.length ? finished.map((b) => b.genre) : readAll.map((b) => b.genre)).slice(0, 5),
    moods: share(readAll.flatMap((b) => b.moods)).slice(0, 10),
    idealPages: sortedPages.length ? sortedPages[Math.floor(sortedPages.length / 2)] : null,
    daysPerBook: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    dnf: books.filter((b) => b.status === 'dnf').length,
    totalRead: readAll.length,
    lateShare: (() => {
      const total = hours.reduce((a, b) => a + b, 0);
      return total ? (hours.slice(22).reduce((a, b) => a + b, 0) + hours.slice(0, 4).reduce((a, b) => a + b, 0)) / total : 0;
    })(),
    sessionsCount: sessions.length,
    more: moreStats(books, finished, sessions, from, to),
  };
}

/** The deeper numbers on the Stats tab. */
function moreStats(books: LibraryBook[], finished: LibraryBook[], sessions: Session[], from: Date, to: Date) {
  const readAll = books.filter((b) => b.status === 'read');
  const withPages = readAll.filter((b) => b.pages);
  const longest = withPages.reduce<LibraryBook | null>((a, b) => (!a || (b.pages ?? 0) > (a.pages ?? 0) ? b : a), null);
  const shortest = withPages.reduce<LibraryBook | null>((a, b) => (!a || (b.pages ?? 0) < (a.pages ?? 0) ? b : a), null);
  const fastest = readAll
    .filter((b) => b.started_on && b.finished_on)
    .map((b) => ({ b, days: Math.max(1, Math.round((Date.parse(b.finished_on!) - Date.parse(b.started_on!)) / 86_400_000)) }))
    .sort((a, b) => a.days - b.days)[0] ?? null;
  const authorCounts = new Map<string, number>();
  readAll.forEach((b) => b.authors.split(',').map((a) => a.trim()).filter(Boolean).forEach((a) => authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1)));
  const decades = new Map<number, number>();
  readAll.forEach((b) => b.year && decades.set(Math.floor(b.year / 10) * 10, (decades.get(Math.floor(b.year / 10) * 10) ?? 0) + 1));
  const ratings = [1, 2, 3, 4, 5].map((n) => readAll.filter((b) => b.rating !== null && Math.ceil(b.rating) === n).length);
  const booksByMonth = Array.from({ length: 12 }, () => 0);
  finished.forEach((b) => (booksByMonth[new Date(b.finished_on!).getMonth()] += 1));
  const weekdays = Array.from({ length: 7 }, () => 0);
  sessions.forEach((x) => {
    const d = new Date(x.created_at);
    if (d >= from && d < to) weekdays[(d.getDay() + 6) % 7] += x.pages_read ?? 0;
  });
  const readingDays = new Set(sessions.map((x) => x.created_at.slice(0, 10))).size;
  return {
    allTimeBooks: readAll.length,
    allTimePages: withPages.reduce((a, b) => a + (b.pages ?? 0), 0),
    reading: books.filter((b) => b.status === 'reading').length,
    wantToRead: books.filter((b) => b.status === 'want_to_read').length,
    avgLength: withPages.length ? Math.round(withPages.reduce((a, b) => a + (b.pages ?? 0), 0) / withPages.length) : null,
    longest,
    shortest,
    fastest,
    topAuthors: [...authorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n })),
    decades: [...decades.entries()].sort((a, b) => a[0] - b[0]).map(([decade, n]) => ({ decade, n })),
    ratings,
    booksByMonth,
    weekdays,
    readingDays,
    oldest: readAll.filter((b) => b.year).sort((a, b) => (a.year ?? 0) - (b.year ?? 0))[0] ?? null,
  };
}

/** Books finished this year by the people I follow (and me). */
export async function friendsBooksThisYear(userId: string, year = new Date().getFullYear()) {
  const follows = unwrap(await supabase.from('follows').select('followee_id').eq('follower_id', userId).eq('status', 'accepted').limit(200));
  const ids = [userId, ...follows.map((f) => f.followee_id)];
  const rows = unwrap(
    await supabase.from('user_books').select('user_id').in('user_id', ids).eq('status', 'read').gte('finished_on', `${year}-01-01`).lte('finished_on', `${year}-12-31`).limit(10000),
  );
  const counts = new Map<string, number>(ids.map((id) => [id, 0]));
  rows.forEach((r) => counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1));
  const profiles = unwrap(await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids));
  return profiles
    .map((p) => ({ ...p, count: counts.get(p.id) ?? 0, me: p.id === userId }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export type WrappedData = {
  period: 'month' | 'year';
  label: string;
  pages: number;
  previousPages: number;
  books: LibraryBook[];
  topBook: LibraryBook | null;
  topGenre: { name: string; pct: number }[];
  topAuthor: { name: string; books: LibraryBook[] } | null;
  peakHour: number | null;
  lateShare: number;
  percentile: number | null;
  streak: number;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m: number) => MONTHS[m];

/** Month: the latest month with reading (this month if it has any). Year: this year. */
export async function getWrapped(userId: string, period: 'month' | 'year'): Promise<WrappedData> {
  const { books, sessions } = await loadAll(userId);
  const now = new Date();
  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let label: string;
  if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
    prevFrom = new Date(now.getFullYear() - 1, 0, 1);
    label = String(now.getFullYear());
  } else {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasThis = sessions.some((s) => Date.parse(s.created_at) >= thisMonth.getTime()) || books.some((b) => inRange(b.finished_on, thisMonth, now));
    from = hasThis ? thisMonth : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    prevFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    label = MONTHS[from.getMonth()];
  }
  const sum = (a: Date, b: Date) => sessions.filter((s) => inRange(s.created_at, a, b)).reduce((t, s) => t + (s.pages_read ?? 0), 0);
  const finished = books.filter((b) => b.status === 'read' && inRange(b.finished_on, from, to));
  let pages = sum(from, to);
  if (!pages) pages = finished.reduce((t, b) => t + (b.pages ?? 0), 0);
  const hours = Array.from({ length: 24 }, () => 0);
  sessions.filter((s) => inRange(s.created_at, from, to)).forEach((s) => (hours[new Date(s.created_at).getHours()] += s.pages_read ?? 0));
  const total = hours.reduce((a, b) => a + b, 0);

  const byAuthor = new Map<string, LibraryBook[]>();
  finished.forEach((b) => b.authors && byAuthor.set(b.authors.split(',')[0], [...(byAuthor.get(b.authors.split(',')[0]) ?? []), b]));
  const topAuthorEntry = [...byAuthor.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  let percentile: number | null = null;
  try {
    const friends = await friendsBooksThisYear(userId);
    if (friends.length > 1) {
      const mine = friends.find((f) => f.me)?.count ?? 0;
      percentile = Math.round((friends.filter((f) => !f.me && f.count < mine).length / (friends.length - 1)) * 100);
    }
  } catch {
    percentile = null;
  }
  const streak = await supabase.rpc('get_reading_streak', {}).then((r) => ((r.data as { longest?: number } | null)?.longest ?? 0), () => 0);

  return {
    period,
    label,
    pages,
    previousPages: sum(prevFrom, from),
    books: finished,
    topBook: [...finished].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null,
    topGenre: share(finished.map((b) => b.genre)).slice(0, 3),
    topAuthor: topAuthorEntry ? { name: topAuthorEntry[0], books: topAuthorEntry[1] } : null,
    peakHour: total ? hours.indexOf(Math.max(...hours)) : null,
    lateShare: total ? (hours.slice(22).reduce((a, b) => a + b, 0) + hours.slice(0, 4).reduce((a, b) => a + b, 0)) / total : 0,
    percentile,
    streak,
  };
}
