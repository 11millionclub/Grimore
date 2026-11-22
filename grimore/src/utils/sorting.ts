import { HOUSE_IDS, type HouseId } from '@/theme/houses';

/** The eight Sorting questions. Each answer gives 2 points to one House. */
export const SORTING_QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;
export type QuestionId = (typeof SORTING_QUESTIONS)[number];
export type Answers = Partial<Record<QuestionId, HouseId>>;
export type Scores = Record<HouseId, number>;

export const POINTS_PER_ANSWER = 2;
/** A gap this small (or smaller) between first and second lets the reader choose. */
export const TORN_GAP = 2;
/** A House holding more than this share of recent sortings is "full" for the soft balance. */
export const BALANCE_LIMIT = 0.35;

export function scoreAnswers(answers: Answers): Scores {
  const s: Scores = { lantern: 0, quill: 0, thorn: 0, hourglass: 0 };
  for (const q of SORTING_QUESTIONS) {
    const h = answers[q];
    if (h) s[h] += POINTS_PER_ANSWER;
  }
  return s;
}

/** Houses ordered by score (highest first), ties broken alphabetically so the order is stable. */
export function rankHouses(scores: Scores): HouseId[] {
  return [...HOUSE_IDS].sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
}

export type SortingOutcome =
  | { kind: 'clear'; house: HouseId; scores: Scores }
  | { kind: 'torn'; top: [HouseId, HouseId]; scores: Scores }
  | { kind: 'tie'; tied: HouseId[]; scores: Scores };

/**
 * Two or more Houses tied for first -> tie-breaker (pick a sign).
 * Gap to second of 2 or less -> "torn between two".
 * Otherwise the top House.
 */
export function decide(answers: Answers): SortingOutcome {
  const scores = scoreAnswers(answers);
  const ranked = rankHouses(scores);
  const top = scores[ranked[0]];
  const tied = ranked.filter((h) => scores[h] === top);
  if (tied.length > 1) return { kind: 'tie', tied, scores };
  if (top - scores[ranked[1]] <= TORN_GAP) return { kind: 'torn', top: [ranked[0], ranked[1]], scores };
  return { kind: 'clear', house: ranked[0], scores };
}

/** Percentages for the reveal ("44 % Lantern, 31 % Thorn…"), summing to 100. */
export function breakdown(scores: Scores): { house: HouseId; pct: number }[] {
  const total = HOUSE_IDS.reduce((a, h) => a + scores[h], 0);
  if (!total) return [];
  const raw = rankHouses(scores).map((house) => ({ house, exact: (scores[house] / total) * 100 }));
  const rows = raw.map((r) => ({ house: r.house, pct: Math.floor(r.exact) }));
  // Largest remainder, so the parts always add up to 100.
  let left = 100 - rows.reduce((a, r) => a + r.pct, 0);
  [...raw]
    .map((r, i) => ({ i, rem: r.exact - Math.floor(r.exact) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (left > 0) {
        rows[i].pct += 1;
        left -= 1;
      }
    });
  return rows.filter((r) => r.pct > 0);
}

/**
 * Soft balance for the tie-breaker: if one of the tied Houses holds more than
 * 35 % of recent sortings, suggest (never force) the least crowded tied House.
 */
export function suggestedTieBreak(tied: HouseId[], recentShare: Partial<Record<HouseId, number>>): HouseId | null {
  if (!tied.some((h) => (recentShare[h] ?? 0) > BALANCE_LIMIT)) return null;
  return [...tied].sort((a, b) => (recentShare[a] ?? 0) - (recentShare[b] ?? 0))[0] ?? null;
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
