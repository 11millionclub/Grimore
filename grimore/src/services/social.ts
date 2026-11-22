import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { authorLine } from './catalogue';

export type PostKind = Database['public']['Enums']['post_kind'];
export type ReportReason = Database['public']['Enums']['report_reason'];

export type FeedAuthor = { id: string; username: string; display_name: string | null; avatar_url: string | null };
export type FeedBook = { id: string; title: string; cover_url: string | null; authors: string; pages: number | null; avg: number | null };

export type FeedItem = {
  item_type: 'post' | 'review';
  id: string;
  kind: PostKind | 'review';
  body: string | null;
  headline: string | null;
  rating: number | null;
  has_spoilers: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  page: number | null;
  quote: string | null;
  stars: number | null;
  days: number | null;
  audience: string;
  community_id: string | null;
  author: FeedAuthor | null;
  book: FeedBook | null;
  liked: boolean;
  saved: boolean;
};

export const FEED_PAGE = 20;

type FeedRow = Database['public']['Views']['feed_items']['Row'];

/** Attach authors, books and my likes to raw feed rows with three batched reads. */
async function hydrate(rows: FeedRow[], viewerId: string): Promise<FeedItem[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const bookIds = [...new Set(rows.map((r) => r.book_id).filter(Boolean))] as string[];
  const postIds = rows.filter((r) => r.item_type === 'post').map((r) => r.id!) ;
  const reviewIds = rows.filter((r) => r.item_type === 'review').map((r) => r.id!);

  const [authors, books, postLikes, reviewLikes, ratings, saves] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds) : Promise.resolve({ data: [], error: null }),
    bookIds.length
      ? supabase.from('books').select('id, title, cover_url, page_count_estimate, book_authors(position, role, authors(name))').in('id', bookIds)
      : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from('post_reactions').select('post_id').eq('user_id', viewerId).in('post_id', postIds) : Promise.resolve({ data: [], error: null }),
    reviewIds.length ? supabase.from('review_reactions').select('review_id').eq('user_id', viewerId).in('review_id', reviewIds) : Promise.resolve({ data: [], error: null }),
    bookIds.length ? supabase.from('reviews').select('book_id, rating').in('book_id', bookIds).limit(2000) : Promise.resolve({ data: [], error: null }),
    rows.length ? supabase.from('saved_items').select('post_id, review_id').eq('user_id', viewerId) : Promise.resolve({ data: [], error: null }),
  ]);
  const sums = new Map<string, { n: number; t: number }>();
  (unwrap(ratings) as { book_id: string; rating: number }[]).forEach((r) => {
    const x = sums.get(r.book_id) ?? { n: 0, t: 0 };
    sums.set(r.book_id, { n: x.n + 1, t: x.t + Number(r.rating) });
  });
  const savedSet = new Set((unwrap(saves) as { post_id: string | null; review_id: string | null }[]).map((x) => (x.post_id ? `post:${x.post_id}` : `review:${x.review_id}`)));

  const authorMap = new Map((unwrap(authors) as FeedAuthor[]).map((a) => [a.id, a]));
  const bookMap = new Map(
    (unwrap(books) as { id: string; title: string; cover_url: string | null; page_count_estimate: number | null; book_authors: Parameters<typeof authorLine>[0] }[]).map((b) => {
      const sum = sums.get(b.id);
      return [b.id, { id: b.id, title: b.title, cover_url: b.cover_url, authors: authorLine(b.book_authors), pages: b.page_count_estimate, avg: sum ? sum.t / sum.n : null }];
    }),
  );
  const liked = new Set([
    ...(unwrap(postLikes) as { post_id: string }[]).map((l) => `post:${l.post_id}`),
    ...(unwrap(reviewLikes) as { review_id: string }[]).map((l) => `review:${l.review_id}`),
  ]);

  return rows.map((r) => ({
    item_type: r.item_type as 'post' | 'review',
    id: r.id!,
    kind: r.kind as FeedItem['kind'],
    body: r.body,
    headline: r.headline,
    rating: r.rating === null ? null : Number(r.rating),
    has_spoilers: !!r.has_spoilers,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
    created_at: r.created_at!,
    page: r.page ?? null,
    quote: r.quote ?? null,
    stars: r.stars === null || r.stars === undefined ? null : Number(r.stars),
    days: r.days ?? null,
    audience: r.audience ?? 'public',
    community_id: r.community_id ?? null,
    author: authorMap.get(r.user_id!) ?? null,
    book: r.book_id ? bookMap.get(r.book_id) ?? null : null,
    liked: liked.has(`${r.item_type}:${r.id}`),
    saved: savedSet.has(`${r.item_type}:${r.id}`),
  }));
}

/**
 * Keyset-paginated feed. "following" shows the people you follow (and you);
 * "discover" shows every visible reader. RLS filters private and blocked users.
 */
export async function getFeed(opts: {
  viewerId: string;
  scope: 'following' | 'discover' | 'reviews';
  cursor?: string | null;
  userId?: string;
  bookId?: string;
  communityId?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  let q = supabase.from('feed_items').select('*').order('created_at', { ascending: false }).limit(FEED_PAGE);
  if (opts.communityId) q = q.eq('community_id', opts.communityId);
  else if (!opts.userId) q = q.neq('audience', 'community');
  if (opts.cursor) q = q.lt('created_at', opts.cursor);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.bookId) q = q.eq('book_id', opts.bookId);
  if (opts.scope === 'reviews') q = q.eq('item_type', 'review');
  if (opts.scope === 'following' && !opts.userId) {
    const follows = unwrap(await supabase.from('follows').select('followee_id').eq('follower_id', opts.viewerId).eq('status', 'accepted').limit(1000));
    q = q.in('user_id', [opts.viewerId, ...follows.map((f) => f.followee_id)]);
  }
  const rows = unwrap(await q);
  const items = await hydrate(rows, opts.viewerId);
  return { items, nextCursor: rows.length === FEED_PAGE ? rows[rows.length - 1].created_at : null };
}

export async function getFeedItem(viewerId: string, type: 'post' | 'review', id: string): Promise<FeedItem | null> {
  const rows = unwrap(await supabase.from('feed_items').select('*').eq('item_type', type).eq('id', id).limit(1));
  if (!rows.length) return null;
  return (await hydrate(rows, viewerId))[0];
}

export async function createPost(input: {
  userId: string;
  kind: PostKind;
  body?: string | null;
  bookId?: string | null;
  hasSpoilers?: boolean;
  page?: number | null;
  quote?: string | null;
  stars?: number | null;
  days?: number | null;
  audience?: 'public' | 'followers' | 'community';
  communityId?: string | null;
}) {
  return unwrap(
    await supabase
      .from('posts')
      .insert({
        user_id: input.userId,
        kind: input.kind,
        body: input.body?.trim() || null,
        book_id: input.bookId ?? null,
        has_spoilers: !!input.hasSpoilers,
        page: input.page ?? null,
        quote: input.quote?.trim() || null,
        stars: input.stars ?? null,
        days: input.days ?? null,
        audience: input.audience ?? 'public',
        community_id: input.audience === 'community' ? input.communityId ?? null : null,
      })
      .select('id')
      .single(),
  );
}

export type BookReview = { id: string; rating: number; body: string | null; headline: string | null; has_spoilers: boolean; like_count: number; created_at: string; author: FeedAuthor | null; friend: boolean };

/** All reviews of a book plus the rating distribution (5 to 1). */
export async function getBookReviews(bookId: string, viewerId: string) {
  const [rows, follows] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, rating, body, headline, has_spoilers, like_count, created_at, author:profiles!reviews_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('book_id', bookId)
      .order('like_count', { ascending: false })
      .limit(200),
    supabase.from('follows').select('followee_id').eq('follower_id', viewerId).eq('status', 'accepted').limit(2000),
  ]);
  const friends = new Set((unwrap(follows) ?? []).map((f) => f.followee_id));
  const list = (unwrap(rows) as unknown as Omit<BookReview, 'friend'>[]).map((r) => ({ ...r, rating: Number(r.rating), friend: !!r.author && friends.has(r.author.id) }));
  const dist = [5, 4, 3, 2, 1].map((star) => list.filter((r) => Math.round(r.rating) === star).length);
  const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : null;
  return { list, dist, avg, count: list.length };
}

export async function upsertReview(input: { userId: string; bookId: string; rating: number; headline?: string; body?: string; hasSpoilers?: boolean }) {
  return unwrap(
    await supabase
      .from('reviews')
      .upsert(
        {
          user_id: input.userId,
          book_id: input.bookId,
          rating: input.rating,
          headline: input.headline?.trim() || null,
          body: input.body?.trim() || null,
          has_spoilers: !!input.hasSpoilers,
        },
        { onConflict: 'user_id,book_id' },
      )
      .select('id')
      .single(),
  );
}

export async function getMyReview(userId: string, bookId: string) {
  return unwrap(await supabase.from('reviews').select('id, rating, headline, body, has_spoilers').eq('user_id', userId).eq('book_id', bookId).maybeSingle());
}

export async function deleteItem(type: 'post' | 'review', id: string) {
  unwrap(await supabase.from(type === 'post' ? 'posts' : 'reviews').delete().eq('id', id));
}

export async function setLiked(type: 'post' | 'review', id: string, userId: string, liked: boolean) {
  if (type === 'post') {
    if (liked) unwrap(await supabase.from('post_reactions').upsert({ post_id: id, user_id: userId }, { ignoreDuplicates: true }));
    else unwrap(await supabase.from('post_reactions').delete().eq('post_id', id).eq('user_id', userId));
  } else if (liked) {
    unwrap(await supabase.from('review_reactions').upsert({ review_id: id, user_id: userId }, { ignoreDuplicates: true }));
  } else {
    unwrap(await supabase.from('review_reactions').delete().eq('review_id', id).eq('user_id', userId));
  }
}

export type Comment = { id: string; body: string; created_at: string; parent_id: string | null; author: FeedAuthor | null };

export async function getComments(type: 'post' | 'review', id: string): Promise<Comment[]> {
  const author = 'author:profiles!%s_user_id_fkey(id, username, display_name, avatar_url)';
  const result =
    type === 'post'
      ? await supabase.from('post_comments').select(`id, body, created_at, parent_id, ${author.replace('%s', 'post_comments')}`).eq('post_id', id).order('created_at').limit(200)
      : await supabase.from('review_comments').select(`id, body, created_at, parent_id, ${author.replace('%s', 'review_comments')}`).eq('review_id', id).order('created_at').limit(200);
  return unwrap(result) as unknown as Comment[];
}

export async function addComment(type: 'post' | 'review', id: string, userId: string, body: string, parentId?: string | null) {
  const trimmed = body.trim();
  if (type === 'post') {
    unwrap(await supabase.from('post_comments').insert({ post_id: id, user_id: userId, body: trimmed, parent_id: parentId ?? null }));
  } else {
    unwrap(await supabase.from('review_comments').insert({ review_id: id, user_id: userId, body: trimmed, parent_id: parentId ?? null }));
  }
}

export async function deleteComment(type: 'post' | 'review', commentId: string) {
  unwrap(await supabase.from(type === 'post' ? 'post_comments' : 'review_comments').delete().eq('id', commentId));
}

export async function getFollowState(viewerId: string, targetId: string): Promise<'none' | 'pending' | 'following'> {
  const row = unwrap(await supabase.from('follows').select('status').eq('follower_id', viewerId).eq('followee_id', targetId).maybeSingle());
  if (!row) return 'none';
  return row.status === 'accepted' ? 'following' : 'pending';
}

export async function follow(viewerId: string, targetId: string) {
  unwrap(await supabase.from('follows').insert({ follower_id: viewerId, followee_id: targetId }));
}

export async function unfollow(viewerId: string, targetId: string) {
  unwrap(await supabase.from('follows').delete().eq('follower_id', viewerId).eq('followee_id', targetId));
}

export async function acceptFollow(viewerId: string, followerId: string) {
  unwrap(await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('followee_id', viewerId));
}

export async function blockUser(viewerId: string, targetId: string) {
  unwrap(await supabase.from('user_blocks').insert({ blocker_id: viewerId, blocked_id: targetId }));
}

export async function report(input: {
  reporterId: string;
  reason: ReportReason;
  details?: string;
  userId?: string;
  postId?: string;
  reviewId?: string;
}) {
  unwrap(
    await supabase.from('content_reports').insert({
      reporter_id: input.reporterId,
      reason: input.reason,
      details: input.details?.slice(0, 1000) ?? null,
      reported_user_id: input.userId ?? null,
      post_id: input.postId ?? null,
      review_id: input.reviewId ?? null,
    }),
  );
}

export async function setSaved(type: 'post' | 'review', id: string, userId: string, saved: boolean) {
  const col = type === 'post' ? 'post_id' : 'review_id';
  if (saved) unwrap(await supabase.from('saved_items').insert(type === 'post' ? { user_id: userId, post_id: id } : { user_id: userId, review_id: id }));
  else unwrap(await supabase.from('saved_items').delete().eq('user_id', userId).eq(col, id));
}

export async function getNotifications(userId: string) {
  return unwrap(
    await supabase
      .from('notifications')
      .select('id, type, read_at, created_at, post_id, review_id, achievement_id, data, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  );
}

export async function unreadNotificationCount(userId: string) {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).is('read_at', null);
  return count ?? 0;
}

export async function markNotificationsRead(userId: string) {
  unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null));
}

export async function getActivityFromFollowed(viewerId: string) {
  const follows = unwrap(await supabase.from('follows').select('followee_id').eq('follower_id', viewerId).eq('status', 'accepted').limit(500));
  const ids = follows.map((f) => f.followee_id);
  if (!ids.length) return [];
  const rows = unwrap(
    await supabase
      .from('user_books')
      .select('id, status, updated_at, user:profiles!user_books_user_id_fkey(id, username, display_name, avatar_url), book:books!user_books_book_id_fkey(id, title, cover_url)')
      .in('user_id', ids)
      .in('status', ['reading', 'read'])
      .order('updated_at', { ascending: false })
      .limit(8),
  );
  return rows;
}
