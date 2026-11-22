-- Richer Market listings: format, language, how the book changes hands,
-- shipping cost and the reader's own description of wear.
alter table public.market_listings
  add column if not exists format text check (format in ('paperback', 'hardcover', 'pocket', 'special')),
  add column if not exists language text check (char_length(language) <= 40),
  add column if not exists delivery text not null default 'both' check (delivery in ('pickup', 'shipping', 'both')),
  add column if not exists shipping_cents integer check (shipping_cents between 0 and 10000),
  add column if not exists published_year smallint check (published_year between 1400 and 2100);
