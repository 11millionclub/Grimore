# Grimore security

How the app is protected, and the switches the team can pull in an emergency.

## Layers

1. **No secrets in the app.** The app only holds the Supabase URL and the public
   (anon/publishable) key. The service-role key and the Anthropic API key live
   only in Supabase (Edge Function secrets). `.env` is git-ignored.
2. **Row Level Security on every table.** Every write policy checks
   `auth.uid()`; readers can only change their own rows. Private profiles,
   birth dates, wallets, points and game answers are invisible to others.
3. **Least privilege grants (second lock).** Signed-out visitors (`anon`) can
   only read `app_config` and check a username on the sign-up form. Signed-in
   readers have no direct write grant on tables only the server writes
   (points, items, games, catalogue, seasons, notifications…); those change
   only through server functions and triggers.
4. **Server functions (RPCs)** are `SECURITY DEFINER` with `search_path = ''`,
   check the caller, respect privacy (`private.can_view_user`) and blocks.
5. **Rate limits** (atomic per reader, `private.enforce_rate_limit`) on posts,
   reviews, comments, replies, threads, messages, reports, guestbook, scans,
   follows, likes, saves, community joins and events, blocks, lists, quotes,
   library entries, catalogue additions and analytics. Daily caps also apply to
   reading time (16 h), the wheel (2 spins) and AI scans.
6. **AI calls never come from the app.** The app calls the `scan-shelf` Edge
   Function with the reader's session; the function creates the scan job *as
   the reader* first (RLS + rate limit + kill switch + daily caps), and only
   then calls the AI with the server-side key. `kobo-import` checks
   `begin_edge_call` (kill switch + 10 imports/hour) before reading the file.
7. **Uploads**: buckets limit size (2–5 MB) and type (JPEG/PNG/WebP); readers
   write only inside their own folder.

## Kill switches (`public.app_config`)

Run in the Supabase SQL editor (only the service role / dashboard can change them):

| Key | Effect | Turn on | Turn off |
| --- | --- | --- | --- |
| `maintenance` | App shows a maintenance screen | `update public.app_config set value = '{"on": true, "message": "Back soon"}' where key = 'maintenance';` | `... '{"on": false}' ...` |
| `writes_paused` | Server refuses new posts, reviews, comments, messages, follows, likes, joins, library changes, scans and imports | `update public.app_config set value = 'true' where key = 'writes_paused';` | `value = 'false'` |
| `ai_scan_enabled` | AI shelf / quote scans on or off | `value = 'false'` | `value = 'true'` |
| `ai_scan_user_daily` / `ai_scan_global_daily` | AI cost caps per reader / overall per UTC day | e.g. `value = '20'` | |
| `kobo_import_enabled` | Kobo import on or off | `value = 'false'` | `value = 'true'` |
| `paywalls` | Paid items, rooms and community tiers locked (`true`) or open for testing (`false`) | `value = 'true'` before launch | `value = 'false'` |

Sign-ups can be paused in the Supabase dashboard (Authentication → Sign In / Providers → allow new users).

## Dashboard settings to keep on

- Authentication → Passwords: **leaked password protection** (HaveIBeenPwned).
- Authentication → Rate limits: keep the defaults (or lower) for sign-ups, OTP and password resets.
- Edge Functions: `verify_jwt` stays on for `scan-shelf` and `kobo-import`.
