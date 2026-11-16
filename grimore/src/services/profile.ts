import { decode } from 'base64-arraybuffer';

import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { toSummary } from './catalogue';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Preferences = Database['public']['Tables']['user_preferences']['Row'];
export type Statistics = Database['public']['Tables']['user_statistics']['Row'];

const profileSelect = 'id, username, display_name, bio, avatar_url, country_code, is_private, onboarding_completed_at, created_at, updated_at';

export async function getProfile(id: string): Promise<Profile> {
  return unwrap(await supabase.from('profiles').select(profileSelect).eq('id', id).single());
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  return unwrap(await supabase.from('profiles').select(profileSelect).eq('username', username).maybeSingle());
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url' | 'is_private' | 'onboarding_completed_at' | 'country_code'>>) {
  return unwrap(await supabase.from('profiles').update(patch).eq('id', id).select(profileSelect).single());
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  return unwrap(await supabase.rpc('is_username_available', { p_username: username }));
}

export async function getPreferences(userId: string): Promise<Preferences> {
  return unwrap(await supabase.from('user_preferences').select('*').eq('user_id', userId).single());
}

export async function updatePreferences(userId: string, patch: Partial<Omit<Preferences, 'user_id' | 'created_at' | 'updated_at'>>) {
  unwrap(await supabase.from('user_preferences').update(patch).eq('user_id', userId));
}

export async function getStatistics(userId: string): Promise<Statistics | null> {
  return unwrap(await supabase.from('user_statistics').select('*').eq('user_id', userId).maybeSingle());
}

export async function getFavoriteGenres(userId: string) {
  const rows = unwrap(await supabase.from('user_favorite_genres').select('genre_id, genres(id, name, slug)').eq('user_id', userId));
  return rows.map((r) => r.genres).filter((g): g is NonNullable<typeof g> => !!g);
}

/** Replace the favourite-genre set in two statements (delete removed, insert added). */
export async function setFavoriteGenres(userId: string, genreIds: number[]) {
  const current = unwrap(await supabase.from('user_favorite_genres').select('genre_id').eq('user_id', userId)).map((r) => r.genre_id);
  const remove = current.filter((id) => !genreIds.includes(id));
  const add = genreIds.filter((id) => !current.includes(id));
  if (remove.length) unwrap(await supabase.from('user_favorite_genres').delete().eq('user_id', userId).in('genre_id', remove));
  if (add.length) unwrap(await supabase.from('user_favorite_genres').insert(add.map((genre_id) => ({ user_id: userId, genre_id }))));
}

export async function getFavoriteBooks(userId: string) {
  const rows = unwrap(
    await supabase
      .from('user_favorite_books')
      .select('position, book:books(id, title, cover_url, first_published_year, book_authors(position, role, authors(name)))')
      .eq('user_id', userId)
      .order('position'),
  );
  return rows.filter((r) => r.book).map((r) => toSummary(r.book as Parameters<typeof toSummary>[0]));
}

export async function addFavoriteBook(userId: string, bookId: string, position: number) {
  unwrap(await supabase.from('user_favorite_books').upsert({ user_id: userId, book_id: bookId, position: Math.min(position, 11) }));
}

export async function removeFavoriteBook(userId: string, bookId: string) {
  unwrap(await supabase.from('user_favorite_books').delete().eq('user_id', userId).eq('book_id', bookId));
}

export async function getAchievements(userId: string) {
  const [all, earned] = await Promise.all([
    supabase.from('achievements').select('*').order('sort_order'),
    supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', userId),
  ]);
  const earnedMap = new Map((unwrap(earned) ?? []).map((e) => [e.achievement_id, e.earned_at]));
  return unwrap(all).map((a) => ({ ...a, earned_at: earnedMap.get(a.id) ?? null }));
}

/** Upload a square avatar (base64 from the image picker) under <uid>/avatar-<ts>.jpg. */
export async function uploadAvatar(userId: string, base64: string, mimeType = 'image/jpeg'): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from('avatars').upload(path, decode(base64), { contentType: mimeType, upsert: true }));
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function searchReaders(query: string) {
  const term = query.trim().replace(/[%_]/g, '');
  if (term.length < 2) return [];
  return unwrap(
    await supabase.from('profiles').select('id, username, display_name, avatar_url').or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20),
  );
}

/** Upload a reader's own Nook background under <uid>/nook-<ts>.<ext>; returns its public URL. */
export async function uploadNookBackground(userId: string, base64: string, mimeType = 'image/jpeg'): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/nook-${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from('nook-backgrounds').upload(path, decode(base64), { contentType: mimeType, upsert: true }));
  return supabase.storage.from('nook-backgrounds').getPublicUrl(path).data.publicUrl;
}
