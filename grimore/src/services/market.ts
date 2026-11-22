import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { authorLine } from './catalogue';

export type Condition = 'like_new' | 'very_good' | 'good' | 'used';
export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'like_new', label: 'Like new' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'used', label: 'Used' },
];
export const conditionLabel = (c: string) => CONDITIONS.find((x) => x.value === c)?.label ?? c;
export const CONDITION_HINTS: Record<Condition, string> = {
  like_new: 'Unread or read once. No marks, spine uncreased.',
  very_good: 'Light reading wear. No writing or loose pages.',
  good: 'Visible wear, creased spine or small marks.',
  used: 'Well loved: notes, highlights or worn cover.',
};

export type Format = 'paperback' | 'hardcover' | 'pocket' | 'special';
export const FORMATS: { value: Format; label: string }[] = [
  { value: 'paperback', label: 'Paperback' },
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'pocket', label: 'Pocket' },
  { value: 'special', label: 'Special edition' },
];
export const formatLabel = (f: string | null) => FORMATS.find((x) => x.value === f)?.label ?? null;

export type Delivery = 'pickup' | 'shipping' | 'both';
export const DELIVERIES: { value: Delivery; label: string }[] = [
  { value: 'pickup', label: 'In person' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'both', label: 'Either' },
];
export const deliveryLabel = (d: string | null) => ({ pickup: 'Hand-over in person', shipping: 'Ships by post', both: 'In person or by post' })[d ?? 'both'] ?? null;

export const money = (cents: number | null | undefined, currency = 'EUR') =>
  cents === null || cents === undefined ? '' : new Intl.NumberFormat('en-IE', { style: 'currency', currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

type Row = Database['public']['Tables']['market_listings']['Row'];
export type Listing = Row & {
  book: { id: string; title: string; cover_url: string | null; authors: string } | null;
  seller: { id: string; username: string; display_name: string | null; avatar_url: string | null; city: string | null } | null;
};

const select = `*, book:books!market_listings_book_id_fkey(id, title, cover_url, book_authors(position, role, authors(name))),
  seller:profiles!market_listings_seller_id_fkey(id, username, display_name, avatar_url, city)`;

type Raw = Omit<Listing, 'book'> & { book: { id: string; title: string; cover_url: string | null; book_authors: Parameters<typeof authorLine>[0] } | null };
const map = (r: Raw): Listing => ({ ...r, book: r.book ? { id: r.book.id, title: r.book.title, cover_url: r.book.cover_url, authors: authorLine(r.book.book_authors) } : null });

export type MarketFilter = 'all' | 'sale' | 'trade' | 'rare' | 'near';

export async function listListings(filter: MarketFilter, city?: string | null): Promise<Listing[]> {
  let q = supabase.from('market_listings').select(select).eq('status', 'active').order('created_at', { ascending: false }).limit(100);
  if (filter === 'sale') q = q.in('mode', ['sale', 'both']);
  if (filter === 'trade') q = q.in('mode', ['trade', 'both']);
  if (filter === 'rare') q = q.eq('is_rare', true);
  if (filter === 'near' && city) q = q.ilike('city', city);
  return (unwrap(await q) as unknown as Raw[]).map(map);
}

export async function getListing(id: string): Promise<Listing> {
  return map(unwrap(await supabase.from('market_listings').select(select).eq('id', id).single()) as unknown as Raw);
}

export async function listingsForBook(bookId: string): Promise<Listing[]> {
  return (unwrap(await supabase.from('market_listings').select(select).eq('book_id', bookId).eq('status', 'active').order('price_cents').limit(20)) as unknown as Raw[]).map(map);
}

export async function myListings(userId: string): Promise<Listing[]> {
  return (unwrap(await supabase.from('market_listings').select(select).eq('seller_id', userId).order('created_at', { ascending: false }).limit(100)) as unknown as Raw[]).map(map);
}

export async function createListing(input: {
  sellerId: string;
  bookId: string;
  userBookId?: string | null;
  mode: 'sale' | 'trade' | 'both';
  priceCents: number | null;
  condition: Condition;
  edition?: string;
  note?: string;
  isRare?: boolean;
  city?: string | null;
  format?: Format | null;
  language?: string;
  delivery?: Delivery;
  shippingCents?: number | null;
  publishedYear?: number | null;
}) {
  return unwrap(
    await supabase
      .from('market_listings')
      .insert({
        seller_id: input.sellerId,
        book_id: input.bookId,
        user_book_id: input.userBookId ?? null,
        mode: input.mode,
        price_cents: input.mode === 'trade' ? null : input.priceCents,
        condition: input.condition,
        edition: input.edition?.trim() || null,
        note: input.note?.trim() || null,
        is_rare: !!input.isRare,
        city: input.city?.trim() || null,
        format: input.format ?? null,
        language: input.language?.trim() || null,
        delivery: input.delivery ?? 'both',
        shipping_cents: input.delivery === 'pickup' ? null : (input.shippingCents ?? null),
        published_year: input.publishedYear ?? null,
      })
      .select('id')
      .single(),
  );
}

export async function setListingStatus(id: string, status: 'active' | 'reserved' | 'sold' | 'removed') {
  unwrap(await supabase.from('market_listings').update({ status }).eq('id', id));
}

export async function sellerStats(sellerId: string) {
  const [active, done] = await Promise.all([
    supabase.from('market_listings').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('status', 'active'),
    supabase.from('market_listings').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId).in('status', ['sold', 'reserved']),
  ]);
  return { active: active.count ?? 0, completed: done.count ?? 0 };
}

export async function makeOffer(input: { listingId: string; buyerId: string; bookIds: string[]; message?: string }) {
  return unwrap(
    await supabase
      .from('trade_offers')
      .insert({ listing_id: input.listingId, buyer_id: input.buyerId, offered_book_ids: input.bookIds, message: input.message?.trim() || null })
      .select('id')
      .single(),
  );
}

export type Offer = Database['public']['Tables']['trade_offers']['Row'] & {
  buyer: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function offersForListing(listingId: string): Promise<Offer[]> {
  return unwrap(
    await supabase
      .from('trade_offers')
      .select('*, buyer:profiles!trade_offers_buyer_id_fkey(id, username, display_name, avatar_url)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false }),
  ) as unknown as Offer[];
}

export async function respondToOffer(offerId: string, accept: boolean) {
  return unwrap(await supabase.rpc('respond_trade', { p_offer: offerId, p_accept: accept }));
}

export async function withdrawOffer(offerId: string) {
  unwrap(await supabase.from('trade_offers').update({ status: 'withdrawn' }).eq('id', offerId));
}

export async function hasAlert(userId: string, bookId: string) {
  return !!unwrap(await supabase.from('market_alerts').select('book_id').eq('user_id', userId).eq('book_id', bookId).maybeSingle());
}

export async function setAlert(userId: string, bookId: string, on: boolean) {
  if (on) unwrap(await supabase.from('market_alerts').upsert({ user_id: userId, book_id: bookId }, { ignoreDuplicates: true }));
  else unwrap(await supabase.from('market_alerts').delete().eq('user_id', userId).eq('book_id', bookId));
}

/** Readers who want a book you have read (wish alerts or Want to Read shelves). */
export async function demandForMyBooks(userId: string): Promise<number> {
  const read = unwrap(await supabase.from('user_books').select('book_id').eq('user_id', userId).in('status', ['read', 'dnf']).limit(500));
  if (!read.length) return 0;
  const ids = read.map((r) => r.book_id);
  const { count } = await supabase.from('market_alerts').select('user_id', { count: 'exact', head: true }).in('book_id', ids).neq('user_id', userId);
  return count ?? 0;
}
