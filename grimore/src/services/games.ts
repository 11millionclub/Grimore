import type { Challenge, Progress } from '@/features/games/types';
import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/**
 * All game state changes go through server-side functions. The client sends
 * intent (a guess, a hint request, an answer); the database validates it
 * against hidden solutions and returns the new canonical state.
 */
export async function getTodayChallenges(): Promise<Challenge[]> {
  return unwrap(await supabase.rpc('get_today_challenges')) as unknown as Challenge[];
}

export async function bookleGuess(challengeId: string, bookId: string): Promise<Challenge> {
  return unwrap(await supabase.rpc('bookle_guess', { p_challenge: challengeId, p_book: bookId })) as unknown as Challenge;
}

export async function coverRevealHint(challengeId: string): Promise<Challenge> {
  return unwrap(await supabase.rpc('cover_reveal_hint', { p_challenge: challengeId })) as unknown as Challenge;
}

export async function coverRevealAnswer(challengeId: string, bookId: string): Promise<Challenge> {
  return unwrap(await supabase.rpc('cover_reveal_answer', { p_challenge: challengeId, p_book: bookId })) as unknown as Challenge;
}

export async function quizAnswer(challengeId: string, index: number): Promise<Challenge> {
  return unwrap(await supabase.rpc('quiz_answer', { p_challenge: challengeId, p_index: index })) as unknown as Challenge;
}

export async function getProgress(userId?: string): Promise<Progress> {
  return unwrap(await supabase.rpc('get_progress', userId ? { p_user: userId } : {})) as unknown as Progress;
}
