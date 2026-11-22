import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { isHouseId, type HouseId } from '@/theme/houses';
import type { Answers, Scores } from '@/utils/sorting';

export type MyHouse = { house: HouseId | null; hidden: boolean; assignedAt: string | null };

export async function getMyHouse(): Promise<MyHouse> {
  const [row] = unwrap(await supabase.rpc('my_house')) ?? [];
  return { house: isHouseId(row?.house_id) ? row.house_id : null, hidden: !!row?.house_hidden, assignedAt: row?.house_assigned_at ?? null };
}

/** Houses of other readers, already filtered for "hide my House" and blocks. */
export async function readerHouses(ids: string[]): Promise<Record<string, HouseId>> {
  const unique = [...new Set(ids)].slice(0, 500);
  if (!unique.length) return {};
  const rows = unwrap(await supabase.rpc('reader_houses', { p_ids: unique })) ?? [];
  return Object.fromEntries(rows.filter((r) => isHouseId(r.house_id)).map((r) => [r.user_id, r.house_id as HouseId]));
}

export async function submitSorting(input: { answers: Answers; tieBreak?: HouseId | null; choice?: HouseId | null }) {
  const res = unwrap(
    await supabase.rpc('submit_sorting', { p_answers: input.answers as unknown as Record<string, string>, p_tie_break: input.tieBreak ?? null, p_choice: input.choice ?? null }),
  ) as { house: HouseId; scores: Scores };
  return res;
}

export async function changeHouse(house: HouseId) {
  return unwrap(await supabase.rpc('change_house', { p_house: house }));
}

export async function setHouseHidden(userId: string, hidden: boolean) {
  unwrap(await supabase.from('profiles').update({ house_hidden: hidden }).eq('id', userId));
}

export async function houseBalance(): Promise<Partial<Record<HouseId, number>>> {
  const rows = unwrap(await supabase.rpc('house_balance')) ?? [];
  return Object.fromEntries(rows.filter((r) => isHouseId(r.house_id)).map((r) => [r.house_id, Number(r.share)]));
}

export async function myAgeBand(): Promise<'unknown' | 'teen' | 'adult'> {
  const band = unwrap(await supabase.rpc('my_age_band'));
  return band === 'teen' || band === 'adult' ? band : 'unknown';
}

export async function hasBirthDate(userId: string) {
  const row = unwrap(await supabase.from('profile_private').select('user_id').eq('user_id', userId).maybeSingle());
  return !!row;
}

/** ISO date (YYYY-MM-DD). The server refuses readers under 13. */
export async function saveBirthDate(userId: string, isoDate: string) {
  unwrap(await supabase.from('profile_private').upsert({ user_id: userId, birth_date: isoDate }, { onConflict: 'user_id' }));
}

export async function latestSorting(userId: string) {
  return unwrap(await supabase.from('sorting_results').select('scores, house_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()) as {
    scores: Scores;
    house_id: HouseId;
    created_at: string;
  } | null;
}
