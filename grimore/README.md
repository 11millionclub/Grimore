# GriMore

**Your world of stories.**

GriMore is a mobile-first literary social app. Readers collect the books they love, keep a journal of their reading life, play three small literary puzzles every day, and share reviews and thoughts with other readers.

**Positioning:** GriMore is first a **digital library** (every book you own, in one place) that helps you decide **what to read next**, starting from your own unread shelves. Social features and three small daily literary riddles are extras around that core.

**Look and feel:** an enchanted reading room. Aged parchment and candlelit oak, wax-seal wine, antique gilt, Cinzel inscriptions and Cormorant Garamond headings, wooden shelves under the covers, and quiet fantasy details (a dragon seal, gothic arches, heraldic icons) that never get in the way of the books.

---

## Contents

- [What is in this version](#what-is-in-this-version)
- [Tech stack](#tech-stack)
- [Run it locally (Expo Go)](#run-it-locally-expo-go)
- [Environment variables](#environment-variables)
- [Supabase](#supabase)
- [Architecture](#architecture)
- [Design system](#design-system)
- [Daily games](#daily-games)
- [Security model](#security-model)
- [Testing](#testing)
- [Deployment notes](#deployment-notes)
- [Status, limitations and next steps](#status-limitations-and-next-steps)

---

## What is in this version

| Area | What works |
| --- | --- |
| **Auth & onboarding** | Email/password sign-up, sign-in, sign-out, password reset by email link. Six-step onboarding: welcome, genres, reading language, first books, favourites, introduction to the games. |
| **Hall (home)** | "Your library" card (tomes owned and unread), **What to read next** chosen from your own unread shelves with a stated reason for each pick, current read, the year's quest, recently shelved books on a plank, suggestions beyond your shelves, other readers' activity, and a small daily-riddles card. |
| **Library** | Virtualised grid or list; search; filters for All / Reading / Want / Read / On hold / DNF with counts; sort by recent activity, date added, title or rating; infinite scroll. |
| **Books** | Search across the GriMore catalogue, Open Library and Google Books (title, author or ISBN with checksum validation); manual entry; book page with status, half-star rating, page progress, private notes, community stats, reviews and editions. |
| **Play** | Bookle, Cover Reveal and Literary Quiz. One canonical puzzle per game per UTC day, validated on the server; global and per-game streaks, Perfect Day bonus, XP, achievements, 12-week activity calendar, Bookle guess distribution and spoiler-free share text. |
| **Social** | Following / Discover / Reviews feeds; five post types (thought, question, recommendation, reading update, discussion); reviews tied to a book with a rating and spoiler flag; likes, threaded replies, follow / unfollow, private accounts with follow requests, block, report, notifications. |
| **Nook (profile)** | A customisable reading room: illustrated library or own-photo background, wax-seal colour, portrait frame, shelf wood, epithet, current obsession, treasured shelf, quotes, kindred authors, quest, seals and writings. See [The Nook](#the-nook). |
| **Polish** | Light and dark themes, safe areas, keyboard handling, skeleton loaders, designed empty and error states, typographic fallback covers, haptics, reduced-motion support, screen-reader labels throughout. |

---

## Tech stack

- **Expo SDK 58** (React Native 0.88, React 19.3), **Expo Router** (file-based navigation), **TypeScript** in strict mode
- **Supabase**: Postgres 17, Auth, Storage, Row Level Security, `pg_cron`, `pg_net`
- **TanStack Query** for server state, **Zustand** for the session
- **React Hook Form** + **Zod** for forms and validation
- **Reanimated 4** for motion, **expo-image** for cached covers, **expo-haptics**
- **Fonts**: Newsreader (editorial serif) and Inter (interface sans), via `@expo-google-fonts`
- **Icons**: Feather (`@expo/vector-icons`), one family throughout

Everything above ships inside Expo Go. No development build is required.

---

## Run it locally (Expo Go)

Requirements: Node 20 or newer, and the **Expo Go** app on your phone (iOS or Android).

```bash
cd grimore
npm install
cp .env.example .env    # then paste your Supabase anon/publishable key
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Press `w` to open the web build in a browser.

> Install new libraries with `npx expo install <package>`, never `npm install <package>`, so versions stay compatible with SDK 58.

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | yes | `https://atyggjdofzdfjbfbisbf.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | The **anon** or **publishable** key (Dashboard → Project Settings → API). Safe in a client: all access is enforced by RLS. |
| `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY` | no | Without it Google Books works at low, shared quotas. For production, create a key restricted to the Books API and to your app IDs. |

`.env` is git-ignored. **Never** put the service-role key, database password or any other secret in an `EXPO_PUBLIC_*` variable: those values are compiled into the app. If the variables are missing, the app shows a friendly "Almost there" screen instead of crashing.

---

## Supabase

### What is deployed

The project `Grimore` (`atyggjdofzdfjbfbisbf`, eu-west-3) already has every migration in `supabase/migrations/` applied, plus the curated seed data and 14 days of scheduled challenges.

| Migration | Contents |
| --- | --- |
| `…01_foundation` | Extensions, `private` schema, helpers, `profiles`, `user_preferences`, `user_statistics`, `genres`, `user_favorite_genres`, sign-up trigger |
| `…02_catalogue_and_library` | `authors`, `books` (the work), `book_authors`, `book_genres`, `book_editions`, `book_identifiers`, `user_books`, `reading_sessions`, `reading_goals`, `reading_lists`, `reading_list_books`, `user_favorite_books`, `user_favorite_authors`, `user_quotes`, `upsert_book()`, `search_catalogue()` |
| `…03_social` | `follows`, `user_blocks`, `posts`, `post_comments`, `post_reactions`, `reviews`, `review_comments`, `review_reactions`, `saved_items`, `notifications`, `content_reports`, counters and notification triggers, `feed_items` view |
| `…04_games_and_gamification` | `quiz_questions`, `daily_challenges`, `daily_challenge_solutions`, `game_attempts`, `game_answers`, `user_game_statistics`, `user_streaks`, `daily_activity`, `achievements`, `user_achievements`, `xp_transactions`, `scan_jobs`, `scan_candidates`, the game functions and the scheduler |
| `…05_row_level_security` | RLS on every table, policies, function and column privileges, `avatars` storage bucket |
| `…06_seed_catalogue` | 20 genres, 8 achievements, 71 curated books by 61 authors, 45 hand-checked quiz questions |
| `…07_operations` | Cover enrichment from Open Library (`pg_net`), and a daily `pg_cron` job that keeps 14 days of challenges published |
| `…08_corner_settings` | `get_corner_settings()` (superseded by 09) |
| `…09_nook` | Nook settings on `user_preferences` (`nook_scene`, `nook_background_url`, `nook_seal`, `nook_frame`, `nook_shelf`, `nook_title`), `get_nook_settings()`, and the `nook-backgrounds` storage bucket (owner-only writes) |

### Setting up a fresh project

With the [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file from `supabase/migrations/` into the SQL Editor, **in filename order**. Then:

- **Authentication → URL Configuration**: add `grimore://**` and your Expo dev URL (for example `exp://192.168.1.10:8081/--/**`) to the redirect allow-list, so email confirmation and password-reset links open the app.
- **Database → Extensions**: `pg_cron` and `pg_net` must be enabled (migration 07 does this where allowed).

### Regenerating types

After any schema change, regenerate `src/types/database.ts`:

```bash
supabase gen types typescript --project-id atyggjdofzdfjbfbisbf > src/types/database.ts
```

Then add the header comment back at the top of the file.

### Book data

- **The work is not the edition.** `books` is the literary work; `book_editions` and `book_identifiers` hold ISBNs, publishers and covers. Two ISBNs never create two books.
- Clients cannot write to the catalogue directly. `upsert_book()` deduplicates in order: any known identifier, then Open Library work key, then exact normalised title plus first author.
- Providers live behind `src/services/books/` (`BookProvider`). Open Library is primary (free, no key, good work-level data); Google Books fills gaps (recent and non-English editions). Results are merged by ISBN (ISBN-10 is converted to ISBN-13) or by exact title and author, and one provider failing never breaks search.
- Covers for the curated catalogue come from Open Library's covers API, accepted only when Open Library's title matches exactly. Book pages credit Open Library.

---

## Architecture

```
grimore/
├── src/
│   ├── app/                    Routes only (Expo Router)
│   │   ├── _layout.tsx         Fonts, providers, auth / onboarding gating (Stack.Protected)
│   │   ├── (auth)/             Welcome, sign-in, sign-up, forgot-password
│   │   ├── (tabs)/             Home, Library, Play, Social, Profile + custom tab bar
│   │   ├── play/               bookle, cover-reveal, quiz, streak
│   │   ├── book/[id]           Book page
│   │   ├── item/[type]/[id]    A post or review with its replies
│   │   ├── user/[username]     Another reader's profile
│   │   └── …                   onboarding, compose, add-book, review editor, settings, corner/edit
│   ├── components/
│   │   ├── ui/                 Design-system primitives (Text, Button, TextField, BookCover, Rating, …)
│   │   ├── games/              Daily strip, streak badge, result panel
│   │   ├── corner/             My Corner renderer
│   │   └── …                   Feed card, book search, shelf, profile view, top bar, tab bar
│   ├── features/
│   │   ├── games/              Types, presentation logic, streak rules, useGame hook
│   │   └── corner/             useCorner
│   ├── services/               Supabase data access, one module per domain
│   │   └── books/              Provider abstraction: Open Library, Google Books, merging
│   ├── hooks/                  Shared TanStack Query hooks
│   ├── lib/                    Supabase client, env validation, query client, error mapping
│   ├── stores/                 Zustand session store
│   ├── theme/                  Tokens: colours (light/dark), spacing, radius, type, motion
│   ├── validation/             Zod schemas
│   ├── types/database.ts       Generated from the live schema
│   └── utils/                  Dates (UTC challenge days), deterministic hashing
└── supabase/
    ├── migrations/             Version-controlled SQL, applied in order
    └── tests/                  security_verification.sql
```

Conventions:

- Screens import components; components import tokens. Colours, sizes and fonts live only in `src/theme/`.
- All server state goes through TanStack Query with keys from `qk` in `src/lib/query-client.ts`.
- Backend errors are mapped to calm, human messages by `toAppError`; raw database errors never reach the UI.
- No `any`. Generated database types flow through every query.

---

## Design system

### Navigation

Five places, with the library at the centre: **Hall** (home), **Library**, a raised wax-seal **Add a book** button, **Readers** (social) and **Nook** (profile). The daily riddles live behind a small card on the Hall.

### The Nook

A reader's profile is their **Nook**: a reading room they can arrange.

- **Room**: six original illustrated libraries (Great Hall, Candlelit Study, Wizard's Tower, Dragon's Archive, Elven Library, Moonlit Reading Room), drawn in SVG in `src/components/nook/library-scene.tsx`, or **their own photo** uploaded to `nook-backgrounds`.
- **Wax seal** colour (wine, emerald, sapphire, amethyst, gilt, obsidian), **portrait frame** (gothic arch, roundel, shield), **shelf wood** (oak, walnut, ebony, birch) and an **epithet** under their name.
- **Current obsession** (featured book with their favourite quote), the **treasured shelf** (up to 12 favourites on a wooden plank), the nightstand, kindred authors, the year's reading quest, earned **seals** (achievements), finished books and their reviews.

The scenes are original artwork made for GriMore. We deliberately do not ship images collected from Pinterest or elsewhere: they belong to their creators. Readers who want a particular look can upload a photo they have the right to use.

### Tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| canvas | `#F3ECDF` | `#13100D` | Parchment / candlelit oak |
| surface | `#FBF7EF` | `#1C1814` | Raised surfaces, inputs |
| surfaceMuted | `#E9E0CF` | `#28221C` | Quiet fills, skeletons |
| ink | `#211B17` | `#EFE5D1` | Primary text (iron-gall ink) |
| inkMuted | `#6E6357` | `#A99D87` | Secondary text |
| border | `#E1D5BF` | `#322A21` | Hairlines |
| accent | `#6E2333` | `#C77A8A` | Wax-seal wine: primary actions |
| gold | `#A3803C` | `#D3AF68` | Gilt ornaments, flourishes, seals |
| olive | `#4E5E45` | `#98AC88` | Forest leather: success, progress |
| shelf | `#7A5534` | `#4A3322` | Wooden planks under books |

- **Type**: **Cinzel** for inscriptions (wordmark, mastheads such as "THE LIBRARY", small-caps labels), **Cormorant Garamond** for headings, book titles and quotes, **Inter** for the interface. Named styles only (`display`, `title1`–`3`, `bookTitle`, `quote`, `body`, `callout`, `caption`, `eyebrow`, …).
- **Ornaments** (`src/components/ornaments.tsx`): flourish dividers, gilt ornate frames, the dragon emblem, gothic arch portraits and shelf planks. Heraldic glyphs (dragon, tower, quill, wizard's hat) come from Font Awesome's free solid set; plain interface icons stay Feather.
- **Spacing**: 4-point scale; screens use a 20 pt edge.
- **Covers**: missing or broken covers render as a designed cloth-bound jacket in one of eight harmonious tones, chosen deterministically from the title.
- **Navigation**: a parchment tab bar with a gilt rule and a raised wax seal for adding books.
- **Motion**: short fades and springs only; skeletons respect reduced-motion settings.

---

## Daily games

Every game has **one canonical challenge per UTC day**. Everyone in the world plays the same puzzle, and reopening the app never changes it. Local dates are shown, but challenge identity is the UTC date.

| Game | How it works | XP |
| --- | --- | --- |
| **Bookle** | Up to six guesses picked from the catalogue. Each guess compares against the answer on decade, primary genre, the author's country, title word count, page-count band and author. Arrows point towards the answer. After three guesses the author's initials are revealed. Missing data shows "?" rather than a guessed clue. | 15 |
| **Cover Reveal** | The cover starts 20% visible behind a 5×5 grid; each of up to three hints uncovers another 20% in a fixed, seeded order. One answer from four options. Score: 100 / 75 / 50 / 25 by hints used. | 15 |
| **Literary Quiz** | One validated question with four options, answered once. The explanation and related book are shown afterwards. | 10 |

- **Perfect Day**: all three in one day, +15 XP.
- **Streaks**: the global streak grows when at least one challenge is completed that day; each game also has its own streak. Missing a day restarts a streak, and the longest is always kept. `user_streaks.freezes_available` exists for a future streak freeze but is not granted or sold.
- **Achievements**: First Day, Three-, Seven- and Thirty-Day Streak, Perfect Day, Book Detective (Bookle in three guesses or fewer), Literary Mind (ten quiz wins), Cover Expert (Cover Reveal with no hints).

### Content pipeline

- `private.schedule_challenges(from, days)` fills empty days from **validated pools only**: curated books with complete metadata (Bookle), curated books with verified covers (Cover Reveal), and quiz questions with `validated_at` set. It is idempotent; answers repeat only after every eligible answer has been used, least recently used first.
- A `pg_cron` job runs it daily at 00:05 UTC to keep 14 days scheduled. Past challenges remain as the historical record.
- **Adding content**: insert into `quiz_questions` with `validated_at = null`, have a person check the facts, then set `validated_at`. Any future AI-generated content must go through the same validation step before publication.

---

## Security model

- **RLS on every table.** Policies target the `authenticated` role; the anonymous role can read nothing (it may only call `is_username_available` during sign-up).
- **Ownership**: users can only insert, update or delete their own rows. Column privileges stop users changing protected columns such as counters, ownership and follow direction.
- **Privacy**: `private.can_view_user()` hides content from blocked users, and from non-followers of private accounts. Following a private account creates a request that only its owner can accept.
- **Games cannot be gamed**: clients have **no write access** to attempts, answers, XP, streaks, statistics or achievements, and cannot read solutions or the quiz bank. Every action goes through a `SECURITY DEFINER` function (`bookle_guess`, `cover_reveal_hint`, `cover_reveal_answer`, `quiz_answer`) that checks it is today's challenge, enforces the limits, validates against hidden solutions and awards XP through an idempotent ledger (`unique (user_id, source_type, source_key)`).
- **Rate limits** on posts, comments, reviews, reports and scan jobs, enforced by database triggers.
- **Secrets**: only the anon/publishable key is in the client. Nothing in this repository contains a secret.

The Supabase security advisor reports these functions as "callable by signed-in users". That is intentional: they are the game API, and each validates the caller itself.

---

## Testing

```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # expo lint (eslint-config-expo)
npm test              # jest: game rules, streaks, XP, Cover Reveal tiles, ISBNs, provider merging, UTC dates
npm run check         # all three
npx expo export --platform ios --platform android --platform web   # bundling check
```

**Database security tests**: `supabase/tests/security_verification.sql` creates two throwaway users inside a transaction, acts as them through the `authenticated` role exactly as PostgREST does, checks 35 assertions, and rolls everything back. It covers: library ownership, XP / streak / attempt tampering, hidden solutions and future challenges, one answer per quiz, duplicate-XP prevention, the First Day achievement, Bookle duplicate guesses, private accounts and follow requests, protected counters, notifications, blocking and anonymous access. Run it in the SQL Editor or with:

```bash
psql "$DATABASE_URL" -f supabase/tests/security_verification.sql
```

---

## Deployment notes

- **Expo Go** is the development target. For store builds, use EAS (`npx eas-cli@latest build`). Set `EXPO_PUBLIC_*` variables as EAS environment variables, and replace the placeholder icon and splash in `assets/`.
- **Deep links** use the `grimore://` scheme. Add the production scheme and domain to Supabase's redirect allow-list.
- **Google Books**: set a restricted key before launch; anonymous quotas are shared and easily exhausted.
- **Moderation**: reports land in `content_reports` with status `open`. There is no moderator UI yet; review them in the Supabase dashboard.

---

## Status, limitations and next steps

### Known limitations

- **Cover Reveal hides the cover in the client.** The image URL is in the challenge payload, so a determined player could open it directly. Serving pre-cropped tiles from an Edge Function would close this.
- **5 of the 71 curated books have no verified cover** (Open Library had no exact title match). They show the designed fallback and are never used for Cover Reveal.
- **Bookle page bands** come from rounded typical-edition counts, cross-checked with Open Library's median where the two agree within 30%. Some editions differ.
- **Push notifications** are not implemented; notifications are in-app only.
- **Scanning** (`scan_jobs`, `scan_candidates`) is schema-only. The "Shelf scanning" card in Add Book is marked as coming soon.
- **Reading lists**: the tables and services exist, but there is no screen for them yet.
- **No moderator dashboard**, and saved posts are stored but have no UI yet.
- **Streak freeze** exists in the schema only, by design.

### Next priorities

1. ISBN barcode scanning with `expo-camera`, then AI-assisted shelf import through `scan_jobs`, with a human review step.
2. Serve Cover Reveal tiles from an Edge Function.
3. Push notifications for replies, follows and streak reminders (opt-in, gentle).
4. Reading lists and saved-items screens; a richer edition picker.
5. A moderator console for `content_reports`.
6. A content-ops screen for validating and scheduling quiz questions.
7. Social sign-in (Apple, Google) through `supabase.auth.signInWithOAuth`.
