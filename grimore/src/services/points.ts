import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/** Personal points: everything earned in the daily games, minus what was spent. The House Cup is never touched. */
export async function getWallet() {
  const [row] = unwrap(await supabase.rpc('my_wallet')) ?? [];
  return { earned: Number(row?.earned ?? 0), spent: Number(row?.spent ?? 0), balance: Number(row?.balance ?? 0) };
}

export type Reward = { id: string; kind: 'corner_item' | 'shop_discount'; title: string; description: string | null; cost_points: number; item_key: string | null; discount_percent: number | null };

export async function listRewards(): Promise<Reward[]> {
  return unwrap(await supabase.from('point_rewards').select('id, kind, title, description, cost_points, item_key, discount_percent').order('kind').order('sort_order').order('cost_points')) as Reward[];
}

export async function myRedemptions(userId: string) {
  return unwrap(await supabase.from('point_redemptions').select('id, reward_id, points, code, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100));
}

export async function redeem(rewardId: string) {
  return unwrap(await supabase.rpc('redeem_reward', { p_reward: rewardId })) as { reward: string; code: string | null; balance: number };
}
