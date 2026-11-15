import { daysBetween } from '@/utils/dates';

/**
 * Client mirror of the streak rules enforced in private.finish_attempt.
 * The server is the source of truth; this exists for display logic and so
 * the rules are covered by unit tests.
 */
export type StreakState = { current: number; longest: number; lastActive: string | null };

/** Apply a completed day to a streak. Same day: unchanged. Next day: +1. Gap: restart at 1. */
export function applyCompletion(state: StreakState, day: string): StreakState {
  if (state.lastActive === day) return state;
  const gap = state.lastActive ? daysBetween(state.lastActive, day) : Infinity;
  if (gap < 0) return state; // never rewind a streak with an older day
  const current = gap === 1 ? state.current + 1 : 1;
  return { current, longest: Math.max(state.longest, current), lastActive: day };
}

/** The streak shown to readers today: a missed day means it is already broken. */
export function effectiveStreak(state: StreakState, today: string): number {
  if (!state.lastActive) return 0;
  return daysBetween(state.lastActive, today) <= 1 ? state.current : 0;
}

/** Is the streak alive but not yet extended today? (gentle reminder, never a guilt trip) */
export function streakAtRisk(state: StreakState, today: string): boolean {
  return state.current > 0 && state.lastActive !== null && daysBetween(state.lastActive, today) === 1;
}

export function xpForGame(game: 'bookle' | 'cover_reveal' | 'quiz'): number {
  return game === 'quiz' ? 10 : 15;
}

/** XP for a day given the set of completed games (each game once, +15 for all three). */
export function xpForDay(completed: readonly ('bookle' | 'cover_reveal' | 'quiz')[]): number {
  const unique = Array.from(new Set(completed));
  const base = unique.reduce((sum, g) => sum + xpForGame(g), 0);
  return base + (unique.length === 3 ? 15 : 0);
}
