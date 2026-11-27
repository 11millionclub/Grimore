import { HOUSE_IDS, type HouseId } from '@/theme/houses';

import { QUIZ, TIE_BREAK_POINTS, VECTOR_ORDER, tieBreakerFor, type QuizOption } from './sorting-quiz';

/** Answers: question id -> option id (never the displayed letter). */
export type Answers = Partial<Record<string, QuizOption['id']>>;
export type Scores = Record<HouseId, number>;

const zero = (): Scores => ({ wanderers: 0, weavers: 0, luminaries: 0, seekers: 0 });

/** Section 5.1: add each chosen answer's four values to the House totals. */
export function scoreAnswers(answers: Answers): Scores {
  const s = zero();
  for (const q of QUIZ) {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    if (!opt) continue;
    VECTOR_ORDER.forEach((h, i) => {
      s[h] += opt.v[i];
    });
  }
  return s;
}

export const isComplete = (answers: Answers) => QUIZ.every((q) => q.options.some((o) => o.id === answers[q.id]));

/** Houses ordered by score (highest first); equal scores keep the fixed House order. */
export function rankHouses(scores: Scores): HouseId[] {
  return [...HOUSE_IDS].sort((a, b) => scores[b] - scores[a] || HOUSE_IDS.indexOf(a) - HOUSE_IDS.indexOf(b));
}

export type SortingOutcome =
  | { kind: 'clear'; house: HouseId; scores: Scores }
  /** Exactly two Houses share the top score: show their pair tie-breaker (section 5.3). */
  | { kind: 'pair'; pair: [HouseId, HouseId]; scores: Scores }
  /** Three or four share it: no automatic winner (section 5.4). */
  | { kind: 'multi'; tied: HouseId[]; scores: Scores };

export function decide(answers: Answers): SortingOutcome {
  const scores = scoreAnswers(answers);
  const ranked = rankHouses(scores);
  const top = scores[ranked[0]];
  const tied = ranked.filter((h) => scores[h] === top);
  if (tied.length === 2) return { kind: 'pair', pair: [tied[0], tied[1]], scores };
  if (tied.length > 2) return { kind: 'multi', tied, scores };
  return { kind: 'clear', house: ranked[0], scores };
}

/** Section 5.3: the tie-breaker answer adds 20 points to its House only. */
export function applyTieBreak(scores: Scores, pair: [HouseId, HouseId], optionId: 'a' | 'b'): { house: HouseId; scores: Scores } {
  const tb = tieBreakerFor(pair[0], pair[1]);
  const house = tb.options.find((o) => o.id === optionId)!.house;
  return { house, scores: { ...scores, [house]: scores[house] + TIE_BREAK_POINTS } };
}

/**
 * Section 5.2 and 5.5: each House's share of the combined score, rounded to
 * whole numbers with a largest-remainder adjustment so they total exactly 100.
 * Returned in the fixed House order; the scores themselves are never changed.
 */
export function percentages(scores: Scores): Record<HouseId, number> {
  const total = HOUSE_IDS.reduce((a, h) => a + scores[h], 0);
  const out = zero();
  if (!total) return out;
  const exact = HOUSE_IDS.map((h) => (scores[h] / total) * 100);
  const floor = exact.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  exact
    .map((e, i) => ({ i, rem: e - Math.floor(e) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
    .forEach(({ i }) => {
      if (left > 0) {
        floor[i] += 1;
        left -= 1;
      }
    });
  HOUSE_IDS.forEach((h, i) => {
    out[h] = floor[i];
  });
  return out;
}

/** Percentages as rows, highest first (for the result screen). */
export function breakdown(scores: Scores): { house: HouseId; pct: number }[] {
  const pct = percentages(scores);
  return rankHouses(scores).map((house) => ({ house, pct: pct[house] }));
}

/** Fisher–Yates with an injectable random source (tests pass a seeded one). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Age in whole years on a given day. */
export function ageOn(birth: Date, today: Date): number {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export type AgeBand = 'under13' | 'teen' | 'adult';
export const ageBand = (age: number): AgeBand => (age < 13 ? 'under13' : age < 16 ? 'teen' : 'adult');

/**
 * House Cup points for one finished daily game, mirroring the server
 * (private.award_game_points). The server is the source of truth; this is for
 * explaining points in the app and for tests of the caps.
 */
export const DAILY_POINT_CAP = 175;
export function gamePoints(input: { solved: boolean; secondsElapsed: number; allFourToday: boolean; streakDays: number; placementPct?: number | null; alreadyToday: number }) {
  const parts: { action: string; points: number }[] = [{ action: 'play', points: 10 }];
  if (input.solved && input.secondsElapsed >= 3) parts.push({ action: 'solve', points: 10 });
  if (input.placementPct != null) {
    const p = input.placementPct <= 0.1 ? 15 : input.placementPct <= 0.25 ? 10 : input.placementPct <= 0.5 ? 5 : 0;
    if (p) parts.push({ action: 'placement', points: p });
  }
  if (input.allFourToday) parts.push({ action: 'all_four', points: 15 });
  parts.push({ action: 'streak', points: Math.min(20, 2 * input.streakDays) });
  let left = Math.max(0, DAILY_POINT_CAP - input.alreadyToday);
  return parts.map((p) => {
    const given = Math.min(p.points, left);
    left -= given;
    return { ...p, points: given };
  });
}
