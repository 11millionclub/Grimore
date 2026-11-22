-- Product analytics events (Sorting funnel, House actions). Readers can only
-- write their own events and cannot read any; the team reads them with the
-- service role.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (name ~ '^[a-z_]{3,48}$'),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) < 2000),
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (name, created_at);
alter table public.analytics_events enable row level security;
create policy "readers log own events" on public.analytics_events for insert to authenticated with check (user_id = (select auth.uid()));
