-- GriMore — one rating per reader and book. Rating a book on its page
-- changed only the library entry, so an existing review (shown on Home and in
-- the feed) kept the old stars, e.g. 5 after re-rating it 6.

create or replace function private.sync_review_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.rating is not null then
    update public.reviews set rating = new.rating
    where user_id = new.user_id and book_id = new.book_id and rating is distinct from new.rating;
  end if;
  return null;
end;
$$;
drop trigger if exists user_books_sync_review_rating on public.user_books;
create trigger user_books_sync_review_rating after insert or update of rating on public.user_books
  for each row execute function private.sync_review_rating();

-- Bring reviews that already drifted in line with the reader's library rating.
update public.reviews r set rating = ub.rating
from public.user_books ub
where ub.user_id = r.user_id and ub.book_id = r.book_id and ub.rating is not null and ub.rating is distinct from r.rating;
