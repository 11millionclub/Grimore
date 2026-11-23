-- Reports can point at community replies and threads too, and a reader can
-- report the same thing only once.
alter table public.content_reports
  add column if not exists community_reply_id uuid references public.community_replies(id) on delete set null,
  add column if not exists community_thread_id uuid references public.community_threads(id) on delete set null;
alter table public.content_reports drop constraint if exists content_reports_check;
alter table public.content_reports add constraint content_reports_target_check
  check (num_nonnulls(reported_user_id, post_id, post_comment_id, review_id, review_comment_id, community_reply_id, community_thread_id) >= 1);
create unique index if not exists content_reports_once on public.content_reports (
  reporter_id,
  coalesce(post_id, post_comment_id, review_id, review_comment_id, community_reply_id, community_thread_id, reported_user_id)
);
