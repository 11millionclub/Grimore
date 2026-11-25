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

/* ---------- House Cup ---------- */

export type Season = { id: number; name: string; starts_at: string; ends_at: string; winner_house_id: HouseId | null };

export async function listSeasons(): Promise<Season[]> {
  return unwrap(await supabase.from('house_seasons').select('id, name, starts_at, ends_at, winner_house_id').order('starts_at')) as Season[];
}

export type Standing = { house: HouseId; points: number; activeMembers: number; members: number; perMember: number };

export async function getStandings(seasonId?: number | null): Promise<Standing[]> {
  const rows = unwrap(await supabase.rpc('get_house_standings', { p_season: seasonId ?? null })) ?? [];
  return rows
    .filter((r) => isHouseId(r.house_id))
    .map((r) => ({ house: r.house_id as HouseId, points: Number(r.points), activeMembers: r.active_members, members: r.members, perMember: Number(r.points_per_member) }));
}

export async function myPoints(seasonId?: number | null): Promise<Record<string, number>> {
  const rows = unwrap(await supabase.rpc('my_house_points', { p_season: seasonId ?? null })) ?? [];
  return Object.fromEntries(rows.map((r) => [r.action, Number(r.points)]));
}

export type Duel = { perMember: number; contributors: number; points: number };

/** This week's duel: points earned this week per contributing member (the standings' scoring, over the week). */
export async function getDuels(): Promise<Record<HouseId, Duel>> {
  const rows = unwrap(await supabase.rpc('house_duels')) ?? [];
  const zero = { perMember: 0, contributors: 0, points: 0 };
  const out: Record<HouseId, Duel> = { lantern: { ...zero }, quill: { ...zero }, thorn: { ...zero }, hourglass: { ...zero } };
  rows.forEach((r) => {
    if (isHouseId(r.house_id)) out[r.house_id] = { perMember: Number(r.points_per_member), contributors: r.contributors, points: Number(r.points) };
  });
  return out;
}

export type Contributor = { user_id: string; username: string; display_name: string | null; avatar_url: string | null; points: number | null };

/** Everyone in the House who earned it points this season (hidden readers are only counted). */
export async function houseContributors(house: HouseId, seasonId?: number | null) {
  return unwrap(await supabase.rpc('house_contributors', { p_house: house, p_season: seasonId ?? null })) as unknown as { total: number; hidden: number; members: Contributor[] };
}

export async function myWeekGames() {
  return (unwrap(await supabase.rpc('my_week_games')) ?? []).map((r) => ({ game: r.game, played: r.played, solved: r.solved, days: r.days }));
}

export async function topContributors(house: HouseId) {
  return unwrap(await supabase.rpc('house_top_contributors', { p_house: house, p_limit: 10 })) ?? [];
}

export async function setLeaderboardOptIn(userId: string, on: boolean) {
  unwrap(await supabase.from('user_preferences').update({ house_leaderboard_opt_in: on }).eq('user_id', userId));
}

/* ---------- Rituals ---------- */

export async function myRitual(): Promise<{ period: string; status: 'joined' | 'completed' } | null> {
  const [row] = unwrap(await supabase.rpc('my_ritual')) ?? [];
  return row ? { period: row.period, status: row.status === 'completed' ? 'completed' : 'joined' } : null;
}
export async function joinRitual() {
  return unwrap(await supabase.rpc('join_ritual'));
}
export async function completeRitual() {
  unwrap(await supabase.rpc('complete_ritual'));
}

/* ---------- Items and marks ---------- */

export async function myItems(userId: string) {
  return unwrap(await supabase.from('user_items').select('item_key, source, season_id, expires_at').eq('user_id', userId));
}

export async function readerMarks(userId: string): Promise<string[]> {
  return (unwrap(await supabase.rpc('reader_marks', { p_user: userId })) ?? []).map((r) => r.item_key);
}

export async function houseRoom(house: HouseId) {
  return unwrap(await supabase.from('communities').select('id, name, member_count').eq('house_id', house).maybeSingle());
}
