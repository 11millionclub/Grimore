# Grimore

**Everything you read, in one place.**

Grimore is a mobile reading app: log what you read and how far you are, discover your reader profile, play four small book games every day, and find people who read like you in communities, messages and a book market.

The interface follows the Grimore UX prototype: near-black by default (with a light theme), one warm ember accent, Geist type, Phosphor icons, glass navigation bars and a floating tab bar.

---

## What is in this version

| Area | What works |
| --- | --- |
| **Sign-in & onboarding** | Email sign-up (name, username, email, password), sign-in by password or one-tap email link, password reset. Onboarding: genres, a 4-question reader test that assigns an archetype (Night Explorer, Saga Devourer, Quote Collector, Archivist, Sprint Reader), four favourite books, a yearly goal, Goodreads / StoryGraph CSV import, the archetype reveal and readers and communities to follow. |
| **Home** | Currently reading with page progress, goal ring, reading streak, monthly Wrapped teaser, today’s Hangman nudge with the fastest friend, and the feed from people you follow. Notifications and messages in the header. |
| **Log (+)** | Photograph a shelf (AI spine recognition), scan an ISBN barcode one by one, search (Grimore catalogue + Open Library + Google Books), update your page (with an optional session note and share), save a quote from a photographed page, post, sell or trade. |
| **Explore** | For you (Reader DNA card, communities ranked by match, readers like you, trending this week, “because you read…”, browse by genre), Communities and the Market. |
| **Play** | Hangman, Hidden Cover, Clues and Timeline. Same games for everyone each UTC day, timed by the server, +10 s per miss or hint, today’s and the weekly leaderboard among people you follow, results with spoiler-free sharing, achievements. |
| **Me** | Your **Corner**: a customisable profile (theme, avatar frame, shelf style, name style, banner stickers, and 15 reorderable blocks such as top four, reading now, goal, virtual shelf, quote, genres, up-next pile, communities and a guestbook). Stats (pages per month, genres, reading hours, reading-days heatmap, you vs. people you follow), shelves (status shelves and your own), Reader DNA, achievements, goals, monthly and yearly **Wrapped** stories with a shareable image. |
| **Books** | Book page with progress, your rating, review, moods and genres, people you follow who have it, reviews with distribution and spoiler blur, communities reading it, copies on the Market and wish alerts. Author pages. |
| **Social** | Feed of reviews, progress, quotes, finished and free posts; likes, comments, saves; audiences (everyone, followers, a community); follows, private accounts, block and report; real-time direct messages. |
| **Communities** | Discover and join, create with a 4-step wizard (cover, access and tiers, rules, earnings estimate), current book with average member progress, next event, discussions with replies and spoiler blur. |
| **Market** | Listings for sale, trade or both; filters (sale, trade, city, rare); trade offers that sellers accept or decline; wish alerts that notify you when a book is listed; contact the seller by message. |

### Payments: built, switched off

Paid Corner items, paid community tiers and market checkout are fully designed and the database is ready, but **no money moves**. Buttons show **“Coming soon”**. Only the service role can grant purchases or paid tiers, so nobody can unlock them from the app. When payments arrive, a webhook (e.g. Stripe, or StoreKit / Play Billing for digital items on iOS / Android) writes `corner_purchases` and sets `community_members.tier`.

---

## Tech stack

- **Expo SDK 58** (React Native 0.88, React 19.3), **Expo Router**, **TypeScript** strict
- **Supabase**: Postgres 17, Auth, Storage, Realtime (messages), Edge Functions, RLS, `pg_cron`, `pg_net`
- **TanStack Query**, **Zustand** (session, appearance), **React Hook Form** + **Zod**
- **Reanimated 4**, **expo-image**, **expo-camera** (barcodes and photos), **expo-blur**, **react-native-svg**, **react-native-view-shot** + **expo-sharing** (Wrapped image)
- **Geist** and **Geist Mono** fonts, **Phosphor** icons (imported one file each to keep the bundle small)

Everything runs in **Expo Go**.

---

## Run it locally

```bash
cd grimore
npm install
cp .env.example .env    # paste your Supabase URL and anon/publishable key
npx expo start
```

| Variable | Required | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | yes | `https://atyggjdofzdfjbfbisbf.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon / publishable key. Safe in the client: RLS enforces access. |
| `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY` | no | Higher Google Books quotas. |

Never put the service-role key or any other secret in an `EXPO_PUBLIC_*` variable.

---

## AI shelf and quote scanning

`supabase/functions/scan-shelf` receives a photo from the app, asks Claude (vision) to read the spines (or the sentences on a page), matches titles against the catalogue, and records the scan in `scan_jobs` / `scan_candidates`. Books not in the catalogue are looked up on Open Library by the app, and nothing is added without the reader ticking it.

**To switch it on**, add the secret in the Supabase dashboard: *Edge Functions → Secrets → `ANTHROPIC_API_KEY`*. The key never reaches the app. Each photo costs one Claude request; scans are limited to 30 per reader per hour. Until the key is set, the scanner shows a friendly “not switched on yet” message. ISBN scanning and search work without it.

---

## Supabase

Migrations in `supabase/migrations/` (all applied to project `atyggjdofzdfjbfbisbf`):

| Migration | Contents |
| --- | --- |
| `01`–`07` | Profiles, catalogue (works vs. editions), library, reading sessions, goals, lists, quotes, social (posts, reviews, comments, likes, follows, blocks, reports, notifications), gamification ledger, RLS, curated seed (71 books), cover enrichment and the daily scheduler |
| `08`–`09` | Earlier profile customisation (kept for history) |
| `10_enums_v2` | New post kinds, game types and notification types |
| `11_platform` | Owned copies, moods, archetype / city, daily page goal, appearance and notification settings; posts v2 with audiences; **communities** (members, tiers, threads, replies, events, match suggestions); **direct messages** with realtime; **market** (listings, trade offers, wish alerts, `respond_trade`); **Corner** (appearance, shop catalogue, purchases, guestbook); `log_progress` and `get_reading_streak` |
| `12_games_v2` | Hangman, Hidden Cover, Clues, Timeline with server-side timing, penalties, hints, `get_game_leaderboard`, `get_weekly_leaderboard`, achievements with progress (`get_achievements`) and the new scheduler (`pg_cron`) |
| `13_seed_v2` | 46 hand-written clue sets, book moods, two weeks of games |
| `14`–`15` | `log_progress` fix, quote scans |

Regenerate types after schema changes:

```bash
supabase gen types typescript --project-id atyggjdofzdfjbfbisbf > src/types/database.ts
```

Deploy the scanner function with `supabase functions deploy scan-shelf`.

---

## Project structure

```
src/app/            screens (Expo Router). (tabs): Home, Explore, + , Play, Me
src/components/     ui kit (Text, Btn, Chip, Segmented, Screen, Sheet, Cover, Avatar…),
                    feed, Corner visuals, games, onboarding flow, scenes
src/services/       data access per domain (library, social, messages, communities,
                    market, corner, games, stats, scan, imports, discover…)
src/hooks/          shared queries
src/theme/          colour tokens (dark/light), type scale, spacing, radii
src/utils/          pure logic with tests (archetype scoring, game helpers, streaks, dates)
supabase/           migrations, Edge Function, SQL security tests
```

Design rules (from the prototype): cards 20 px radius, tiles and inputs 14 px, buttons and chips are pills, covers 4 px; one accent; press feedback on every tappable; motion respects the system’s reduced-motion setting.

---

## Security model

- **RLS on every table**, policies for `authenticated` only; anonymous users can only check username availability.
- **Ownership and column privileges** stop users editing other people’s rows, counters or protected columns.
- **Visibility**: blocked users and non-followers of private accounts see nothing; posts respect their audience (followers / community members only).
- **Games**: answers, solutions and clue sets are never readable; every guess goes through a `SECURITY DEFINER` function that checks the day, times the attempt on the server and awards XP once.
- **Messages**: only the two participants can read a conversation; blocked pairs cannot write.
- **Communities and market**: only hosts manage their communities, only sellers edit listings and answer offers; paid tiers and Corner items can only be granted by the service role.
- **Rate limits** on posts, comments, messages, threads, listings, offers, guestbook notes and scans.
- **Secrets**: only the anon key ships in the app. `ANTHROPIC_API_KEY` lives in Supabase secrets.

The Supabase advisor lists the RPC functions as “callable by signed-in users”: that is intentional, they are the app’s API and validate the caller.

---

## Checks

```bash
npm run typecheck && npm run lint && npm test
npx expo export --platform web --platform android
```

---

## Limitations and next steps

- **Payments** are switched off (see above).
- **Push notifications** are in-app only.
- **Timeline and Corner block order** use arrow buttons instead of drag and drop.
- **Hidden Cover** sends the cover URL to the client; serving pre-blurred images from an Edge Function would close that gap.
- **Reading compatibility** and community match are simple overlap scores, to be refined with more data.
- No moderator console yet: reports land in `content_reports`.
