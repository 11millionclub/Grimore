import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { env } from '@/lib/env';
import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/** Points each side gets (kept in step with redeem_invite in the database). */
export const INVITE_POINTS = { inviter: 100, invitee: 50 } as const;

const PENDING_KEY = 'grimore-pending-invite';

export async function myInviteCode(): Promise<string> {
  return unwrap(await supabase.rpc('my_invite_code')) as string;
}

/** Public link for a code. Falls back to the current site on the web. */
export function inviteLink(code: string) {
  const base = env.EXPO_PUBLIC_APP_URL ?? (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://grimore.expo.app');
  return `${base.replace(/\/$/, '')}/invite/${code}`;
}

export async function redeemInvite(code: string) {
  return unwrap(await supabase.rpc('redeem_invite', { p_code: code.trim().toUpperCase() })) as { points: number };
}

export async function inviteStats(userId: string) {
  const [joined, grants] = await Promise.all([
    supabase.from('invite_redemptions').select('invitee_id, created_at').eq('inviter_id', userId),
    supabase.from('point_grants').select('points, reason').eq('user_id', userId).in('reason', ['invite_sent', 'invite_joined']),
  ]);
  const used = unwrap(await supabase.from('invite_redemptions').select('inviter_id').eq('invitee_id', userId).maybeSingle());
  return {
    joined: (unwrap(joined) ?? []).length,
    points: (unwrap(grants) ?? []).reduce((a, g) => a + g.points, 0),
    usedCode: !!used,
  };
}

/** A code from a link opened before signing up; redeemed once the reader is in. */
export const pendingInvite = {
  get: () => AsyncStorage.getItem(PENDING_KEY),
  set: (code: string) => AsyncStorage.setItem(PENDING_KEY, code.trim().toUpperCase()),
  clear: () => AsyncStorage.removeItem(PENDING_KEY),
};
