import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type DiscoverQuery = { moods: string[]; tropes: string[]; spice: SpiceBand; length: LengthBand; genre: number | null };
export type SpiceBand = 'any' | 'none' | 'warm' | 'hot';
export type LengthBand = 'any' | 'short' | 'medium' | 'long';

export const SPICE_BANDS: { id: SpiceBand; label: string; min?: number; max?: number }[] = [
  { id: 'any', label: 'Any spice' },
  { id: 'none', label: 'Little or none', max: 1.9 },
  { id: 'warm', label: 'Warm', min: 2, max: 3.4 },
  { id: 'hot', label: 'Hot', min: 3.5 },
];
export const LENGTH_BANDS: { id: LengthBand; label: string; min?: number; max?: number }[] = [
  { id: 'any', label: 'Any length' },
  { id: 'short', label: 'Short (under 250 p.)', max: 249 },
  { id: 'medium', label: 'Medium (250–450 p.)', min: 250, max: 450 },
  { id: 'long', label: 'Long (over 450 p.)', min: 451 },
];

export type FoundBook = { id: string; title: string; cover_url: string | null; pages: number | null; year: number | null; moods: string[]; tropes: string[]; spice: number | null; spice_votes: number; authors: string | null };

/** Books matching every chosen mood and trope, the spice band, length and genre. */
export async function discoverBooks(q: DiscoverQuery): Promise<FoundBook[]> {
  const s = SPICE_BANDS.find((b) => b.id === q.spice)!;
  const l = LENGTH_BANDS.find((b) => b.id === q.length)!;
  return (unwrap(
    await supabase.rpc('discover_books', {
      p_moods: q.moods.length ? q.moods : null,
      p_tropes: q.tropes.length ? q.tropes : null,
      p_spice_min: s.min ?? null,
      p_spice_max: s.max ?? null,
      p_genre: q.genre,
      p_min_pages: l.min ?? null,
      p_max_pages: l.max ?? null,
      p_limit: 60,
    }),
  ) ?? []) as unknown as FoundBook[];
}

export async function bookMoods(): Promise<string[]> {
  return ((unwrap(await supabase.rpc('book_moods')) ?? []) as { mood: string }[]).map((r) => r.mood);
}

export const moodLabel = (m: string) => m.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
