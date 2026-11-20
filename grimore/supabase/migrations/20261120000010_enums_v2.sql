-- GriMore — 0010 Enum values for v2 (must commit before use)

-- Post types from the v2 feed: progress, quote, finished and free posts.
alter type public.post_kind add value if not exists 'progress';
alter type public.post_kind add value if not exists 'quote';
alter type public.post_kind add value if not exists 'finished';
alter type public.post_kind add value if not exists 'free';

-- New daily games (the v1 games are retired, their history kept).
alter type public.game_type add value if not exists 'hangman';
alter type public.game_type add value if not exists 'cover';
alter type public.game_type add value if not exists 'clues';
alter type public.game_type add value if not exists 'timeline';

-- Notification kinds for games, the market, communities and trades.
alter type public.notification_type add value if not exists 'game';
alter type public.notification_type add value if not exists 'market';
alter type public.notification_type add value if not exists 'community';
alter type public.notification_type add value if not exists 'trade';
