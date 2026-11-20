-- GriMore — 0015 Quote scanning uses the same scan jobs (and rate limit) as shelves.
alter table public.scan_jobs drop constraint if exists scan_jobs_source_check;
alter table public.scan_jobs add constraint scan_jobs_source_check
  check (source in ('isbn_barcode', 'shelf_photo', 'quote_photo', 'manual_list'));
