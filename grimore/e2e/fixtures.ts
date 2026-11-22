import type { Page, Route } from '@playwright/test';

/**
 * Fixture data that stands in for Supabase in mock mode, so the UI can be
 * exercised without network access or a real account.
 */
export const ME = '11111111-1111-4111-8111-111111111111';
const FRIEND = '22222222-2222-4222-8222-222222222222';
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);

const book = (id: string, title: string, author: string, year: number) => ({
  id,
  title,
  cover_url: null,
  first_published_year: year,
  page_count_estimate: 320,
  normalized_title: title.toLowerCase(),
  moods: ['reflective', 'dark'],
  book_authors: [{ position: 0, role: 'author', authors: { id: `a${id}`, name: author, nationality_code: 'GB' } }],
});
const BOOKS = [
  book('b1', 'One Hundred Years of Solitude', 'Gabriel García Márquez', 1967),
  book('b2', 'Mrs Dalloway', 'Virginia Woolf', 1925),
  book('b3', 'Blindness', 'José Saramago', 1995),
  book('b4', 'Beloved', 'Toni Morrison', 1987),
  book('b5', 'The Remains of the Day', 'Kazuo Ishiguro', 1989),
  book('b6', 'Things Fall Apart', 'Chinua Achebe', 1958),
];
const card = (b: (typeof BOOKS)[number]) => ({ id: b.id, title: b.title, authors: [b.book_authors[0].authors.name], cover_url: null });

export const profile = {
  id: ME,
  username: 'test.reader',
  display_name: 'Test Reader',
  bio: 'Reads slowly, underlines everything.',
  avatar_url: null,
  country_code: 'PT',
  city: 'Lisboa',
  archetype: 'night',
  is_private: false,
  onboarding_completed_at: '2026-11-10T10:00:00Z',
  created_at: '2026-11-10T10:00:00Z',
  updated_at: '2026-11-10T10:00:00Z',
};
const friend = { id: FRIEND, username: 'ines.reads', display_name: 'Inês Costa', avatar_url: null, archetype: 'saga' };

const statuses = ['reading', 'read', 'read', 'want_to_read', 'reading', 'read'];
type Entry = { id: string; status: string; rating: number | null; progress_percent: number | null; current_page: number | null; started_on: string | null; finished_on: string | null; book: (typeof BOOKS)[number] } & Record<string, unknown>;
const entries: Entry[] = BOOKS.map((b, i) => ({
  id: `e${i}`,
  status: statuses[i],
  rating: statuses[i] === 'read' ? 4 : null,
  progress_percent: statuses[i] === 'reading' ? 42 : null,
  current_page: statuses[i] === 'reading' ? 134 : null,
  started_on: '2026-11-02',
  finished_on: statuses[i] === 'read' ? '2026-11-08' : null,
  notes: null,
  is_private: false,
  is_owned: true,
  added_at: '2026-11-10T10:00:00Z',
  updated_at: '2026-11-12T10:00:00Z',
  book: b,
}));

const games = [
  {
    id: 'g1',
    game: 'hangman',
    number: 4,
    challenge_date: today,
    payload: { mask: 'The ____ of the ____', max_misses: 6, year: 1980, genre: 'Mystery & Crime' },
    attempt: null,
    view: { mask: 'The ____ of the ____', guessed: [], misses: 0, hinted: false },
    solution: null,
  },
  { id: 'g2', game: 'cover', number: 4, challenge_date: today, payload: { cover_url: 'https://covers.openlibrary.org/b/id/1-L.jpg', max_errors: 4, options: BOOKS.map(card) }, attempt: null, view: { wrong: [], removed: [], level: 0 }, solution: null },
  {
    id: 'g3',
    game: 'clues',
    number: 4,
    challenge_date: today,
    payload: { total_clues: 5, max_misses: 5 },
    attempt: { status: 'won', started_at: today, completed_at: today, penalty_seconds: 10, time_seconds: 58, misses: 1, hints_used: 0, xp_awarded: 15 },
    view: { clues: ['Published in 1945', 'A political allegory written as a fable'], misses: [] },
    solution: { book: card(BOOKS[1]) },
  },
  { id: 'g4', game: 'timeline', number: 4, challenge_date: today, payload: { books: BOOKS.slice(0, 5).map(card) }, attempt: null, view: { locked: [null, null, null, null, null], last: null }, solution: null },
];

const community = {
  id: 'cm1',
  slug: 'night-readers',
  name: 'Night Readers',
  tagline: 'For those who read after midnight.',
  description: null,
  cover_scene: 'moonlit-reading-room',
  host_id: FRIEND,
  price_cents: null,
  max_members: null,
  rules: {},
  reading_book_id: 'b3',
  reading_note: 'Chapters 9 to 12 this week',
  member_count: 42,
  created_at: today,
  updated_at: today,
  host: friend,
  reading: BOOKS[2],
};
const listing = {
  id: 'l1',
  seller_id: FRIEND,
  book_id: 'b1',
  user_book_id: null,
  mode: 'both',
  price_cents: 900,
  currency: 'EUR',
  condition: 'very_good',
  edition: 'Penguin, 2014',
  note: 'Read once.',
  is_rare: false,
  city: 'Lisboa',
  status: 'active',
  created_at: today,
  updated_at: today,
  book: BOOKS[0],
  seller: { ...friend, city: 'Lisboa' },
};
const feed = [
  {
    item_type: 'review',
    id: 'r1',
    user_id: FRIEND,
    book_id: 'b3',
    kind: 'review',
    rating: 4.5,
    headline: 'A parable that refuses to look away',
    body: 'Harrowing and strangely tender.',
    has_spoilers: false,
    like_count: 12,
    comment_count: 3,
    created_at: new Date(now - 3600e3).toISOString(),
    page: null,
    quote: null,
    stars: 4.5,
    days: null,
    audience: 'public',
    community_id: null,
  },
];

function rows(path: string, q: URLSearchParams, single: boolean): unknown {
  const status = (q.get('status') ?? '').replace('eq.', '');
  switch (path) {
    case 'rpc/get_today_games':
      return games;
    case 'rpc/get_game_state':
    case 'rpc/start_game':
      return games[0];
    case 'rpc/get_reading_streak':
      return { current: 6, longest: 12, today_pages: 24, daily_goal: 30, week: [] };
    case 'rpc/get_game_leaderboard':
      return [{ rank: 1, user_id: FRIEND, username: friend.username, display_name: friend.display_name, avatar_url: null, time_seconds: 41, tries: 1, is_me: false }];
    case 'rpc/get_weekly_leaderboard':
      return [];
    case 'rpc/get_achievements':
      return [{ id: 'first_day', name: 'First Day', description: 'Complete your first daily game.', icon: 'star', category: 'games', xp_reward: 10, earned_at: today, progress: 1, target: 1 }];
    case 'rpc/list_conversations':
      return [];
    case 'rpc/suggest_communities':
      return [{ id: 'cm1', match: 94 }];
    case 'rpc/search_catalogue':
      return BOOKS.map((b) => ({ id: b.id, title: b.title, cover_url: null, first_published_year: b.first_published_year, authors: b.book_authors[0].authors.name, score: 1 }));
    case 'profiles':
      return single ? profile : [profile, friend];
    case 'user_preferences':
      return { user_id: ME, show_spoilers: false, daily_pages_goal: 30, appearance: 'dark', notification_settings: {} };
    case 'user_books': {
      const bookId = (q.get('book_id') ?? '').replace('eq.', '');
      let list = status ? entries.filter((e) => e.status === status) : entries;
      if (bookId) list = list.filter((e) => e.book.id === bookId);
      return single ? (list[0] ?? null) : list;
    }
    case 'reading_goals':
      return single ? { id: 'g', target_books: 40, year: new Date().getFullYear() } : [];
    case 'books':
      return single
        ? { ...BOOKS[2], description: 'A city goes blind.', subtitle: null, cover_source: null, original_language: 'pt', primary_genre: { id: 1, name: 'Literary Fiction', slug: 'literary-fiction' }, book_genres: [], book_editions: [] }
        : BOOKS;
    case 'corners':
      return { user_id: ME, theme: 'forest', frame: 'gold', shelf: 'theme', name_style: 'plain', pack: 'reader', widgets: ['status', 'top4', 'reading', 'goal', 'shelf'], status_text: 'Reading Blindness on the train', song: null, pinned_review_id: null, badge_ids: [], updated_at: today };
    case 'corner_items':
      return [
        { key: 'theme:forest', kind: 'theme', name: 'Forest', price_cents: null, sort_order: 1 },
        { key: 'theme:holo', kind: 'theme', name: 'Holographic', price_cents: 199, sort_order: 2 },
        { key: 'frame:gold', kind: 'frame', name: 'Gold', price_cents: 99, sort_order: 1 },
      ];
    case 'corner_purchases':
      return [{ item_key: 'frame:gold' }];
    case 'communities':
      return single ? community : [community];
    case 'market_listings':
      return single ? listing : [listing];
    case 'feed_items':
      return feed;
    case 'genres':
      return [{ id: 1, slug: 'literary-fiction', name: 'Literary Fiction' }];
    case 'user_favorite_books':
      return BOOKS.slice(0, 4).map((b, i) => ({ position: i, book: b }));
    default:
      return single ? null : [];
  }
}

const initial = JSON.stringify(entries);
function resetLibrary() {
  entries.splice(0, entries.length, ...(JSON.parse(initial) as Entry[]));
  writes.length = 0;
}

/** Writes the app made, for assertions. */
export const writes: { method: string; path: string; body: unknown }[] = [];

const utcToday = () => new Date().toISOString().slice(0, 10);
const violation = (e: Partial<Entry>) => !!(e.finished_on && e.started_on && e.finished_on < e.started_on);

/**
 * Library writes keep state and apply the same rules as the database:
 * the status-date trigger and the finished_on >= started_on check.
 */
function writeUserBooks(method: string, path: string, q: URLSearchParams, raw: string | null): { status: number; body: unknown } | null {
  if (method === 'GET') return null;
  const body = raw ? JSON.parse(raw) : null;
  writes.push({ method, path, body });
  const fail = { status: 400, body: { code: '23514', message: 'new row for relation "user_books" violates check constraint "user_books_check"' } };
  const applyDates = (e: Entry) => {
    if (e.status === 'reading' && !e.started_on) e.started_on = utcToday();
    if (e.status === 'read') {
      if (!e.finished_on) e.finished_on = utcToday();
      e.progress_percent = 100;
    }
  };
  if (path === 'user_books' && method === 'POST') {
    const rows = (Array.isArray(body) ? body : [body]) as Partial<Entry & { book_id: string }>[];
    for (const r of rows) {
      const cur = entries.find((e) => e.book.id === r.book_id);
      const next = { ...(cur ?? { id: `e${entries.length}`, status: 'want_to_read', rating: null, progress_percent: null, current_page: null, started_on: null, finished_on: null, book: BOOKS.find((b) => b.id === r.book_id) ?? BOOKS[0] }), ...r } as Entry;
      delete (next as Record<string, unknown>).book_id;
      delete (next as Record<string, unknown>).user_id;
      applyDates(next);
      if (violation(next)) return fail;
      if (cur) Object.assign(cur, next);
      else entries.push(next);
    }
    return { status: 201, body: { id: 'e-new' } };
  }
  if (path === 'user_books' && method === 'DELETE') {
    const bookId = (q.get('book_id') ?? '').replace('eq.', '');
    const i = entries.findIndex((e) => e.book.id === bookId);
    if (i >= 0) entries.splice(i, 1);
    return { status: 204, body: null };
  }
  if (path === 'rpc/log_progress') {
    const b = body as { p_book: string; p_page: number };
    let cur = entries.find((e) => e.book.id === b.p_book);
    if (!cur) {
      cur = { id: `e${entries.length}`, status: 'reading', rating: null, progress_percent: null, current_page: null, started_on: utcToday(), finished_on: null, book: BOOKS.find((x) => x.id === b.p_book) ?? BOOKS[0] } as Entry;
      entries.push(cur);
    }
    const total = cur.book.page_count_estimate;
    const prev = cur.current_page ?? 0;
    const page = Math.min(b.p_page, total);
    cur.current_page = page;
    cur.progress_percent = Math.min(100, Math.round((page * 100) / total));
    if (['want_to_read', 'on_hold', 'dnf'].includes(cur.status)) cur.status = 'reading';
    applyDates(cur);
    return { status: 200, body: { user_book_id: cur.id, page, total, pages_logged: Math.max(page - prev, 0), post_id: null } };
  }
  if (path === 'reading_list_books' || path === 'reading_lists' || path === 'market_alerts' || path.startsWith('rpc/')) return null;
  return null;
}

/** Sign the browser in as the fixture reader and answer every Supabase call. */
export async function useMockBackend(page: Page) {
  resetLibrary();
  await page.addInitScript((me) => {
    const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: me, role: 'authenticated', exp: 4102444800 }))}.sig`;
    const session = { access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: me, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-11-10T10:00:00Z' } };
    // Supabase stores the session under sb-<project-ref>-auth-token; cover any ref.
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (/^sb-.*-auth-token$/.test(key)) return JSON.stringify(session);
      return orig.call(this, key);
    };
  }, ME);
  await page.route(/\.supabase\.co\//, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (url.pathname.startsWith('/realtime/')) return route.abort();
    const path = url.pathname.replace('/rest/v1/', '');
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    if (req.method() === 'HEAD') return route.fulfill({ status: 200, body: '', headers: { 'content-range': '0-0/3' } });
    const write = writeUserBooks(req.method(), path, url.searchParams, req.postData());
    if (write) return route.fulfill({ status: write.status, contentType: 'application/json', body: JSON.stringify(write.body) });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/3' }, body: JSON.stringify(rows(path, url.searchParams, single)) });
  });
  // External book APIs and covers are not needed for UI checks.
  await page.route(/openlibrary\.org|googleapis\.com/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"docs":[],"items":[]}' }));
}
