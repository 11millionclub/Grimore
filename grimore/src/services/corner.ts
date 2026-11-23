import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type CornerRow = Database['public']['Tables']['corners']['Row'];
export type CornerItem = Database['public']['Tables']['corner_items']['Row'];

export type Widget =
  | 'status'
  | 'top4'
  | 'reading'
  | 'goal'
  | 'year'
  | 'quote'
  | 'review'
  | 'wrapped'
  | 'badges'
  | 'shelf'
  | 'genres'
  | 'authors'
  | 'tbr'
  | 'communities'
  | 'guestbook';

export const WIDGETS: Record<Widget, { name: string; desc: string }> = {
  status: { name: 'Status and soundtrack', desc: 'What you are reading and listening to now' },
  top4: { name: 'My four', desc: 'Your all-time books' },
  reading: { name: 'Reading now', desc: 'Live progress' },
  goal: { name: 'Goal and streak', desc: 'Yearly goal ring' },
  year: { name: 'Your year in numbers', desc: 'Books, pages, days' },
  quote: { name: 'Favourite quote', desc: 'One quote, in the spotlight' },
  review: { name: 'Pinned review', desc: 'Your best review' },
  wrapped: { name: 'Wrapped', desc: 'Shortcuts to your month and year' },
  badges: { name: 'Achievements', desc: 'The ones you earned' },
  shelf: { name: 'Virtual shelf', desc: 'Spines on a shelf' },
  genres: { name: 'Genres and moods', desc: 'Your taste in tags' },
  authors: { name: 'Favourite authors', desc: 'Up to six authors' },
  tbr: { name: 'Up next pile', desc: 'What comes next' },
  communities: { name: 'Communities', desc: 'Where you take part' },
  guestbook: { name: 'Guestbook', desc: 'Notes from your visitors' },
};
export const ALL_WIDGETS = Object.keys(WIDGETS) as Widget[];

export type CornerWithBanner = CornerRow & { community_banner: { id: string; name: string; banner_url: string | null } | null };

/** The reader's Corner, with the community banner they wear (if any). */
export async function getCorner(userId: string): Promise<CornerWithBanner | null> {
  return unwrap(
    await supabase.from('corners').select('*, community_banner:communities!corners_community_banner_id_fkey(id, name, banner_url)').eq('user_id', userId).maybeSingle(),
  ) as unknown as CornerWithBanner | null;
}

export async function saveCorner(userId: string, patch: Partial<Omit<CornerRow, 'user_id' | 'updated_at'>>) {
  unwrap(await supabase.from('corners').upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' }));
}

export async function getShop(): Promise<CornerItem[]> {
  return unwrap(await supabase.from('corner_items').select('*').order('kind').order('sort_order'));
}

export async function getPurchases(userId: string): Promise<string[]> {
  return unwrap(await supabase.from('corner_purchases').select('item_key').eq('user_id', userId)).map((r) => r.item_key);
}

export type GuestbookEntry = { id: string; body: string; created_at: string; author: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null };

export async function listGuestbook(ownerId: string): Promise<GuestbookEntry[]> {
  return unwrap(
    await supabase
      .from('corner_guestbook')
      .select('id, body, created_at, author:profiles!corner_guestbook_author_id_fkey(id, username, display_name, avatar_url)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(30),
  ) as unknown as GuestbookEntry[];
}

export async function signGuestbook(ownerId: string, authorId: string, body: string) {
  unwrap(await supabase.from('corner_guestbook').insert({ owner_id: ownerId, author_id: authorId, body: body.trim().slice(0, 280) }));
}

export async function deleteGuestbookEntry(id: string) {
  unwrap(await supabase.from('corner_guestbook').delete().eq('id', id));
}
