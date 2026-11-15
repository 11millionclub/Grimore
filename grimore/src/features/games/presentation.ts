import { seededShuffle } from '@/utils/hash';

import type { BookleFeedback, CoverRevealChallenge, FeedbackResult, GameAnswer } from './types';

/** Page-count bands used by Bookle (must match private.page_band). */
export const PAGE_BANDS = ['Under 200', '200–349', '350–499', '500–699', '700+'] as const;

export const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom', IE: 'Ireland', US: 'United States', CA: 'Canada', FR: 'France', ES: 'Spain', PT: 'Portugal',
  IT: 'Italy', DE: 'Germany', RU: 'Russia', CO: 'Colombia', BR: 'Brazil', CL: 'Chile', MX: 'Mexico', AR: 'Argentina',
  NG: 'Nigeria', JP: 'Japan', IN: 'India', CN: 'China', ZA: 'South Africa', AU: 'Australia', SE: 'Sweden', NO: 'Norway',
};

export function countryName(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  return COUNTRY_NAMES[code] ?? code;
}

export type FeedbackTone = 'match' | 'close' | 'miss' | 'unknown';

export function toneFor(result: FeedbackResult): FeedbackTone {
  if (result === 'match') return 'match';
  if (result === 'partial') return 'close';
  if (result === 'unknown') return 'unknown';
  return 'miss';
}

/** Direction hint for ordered clues, from the answer's perspective. */
export function directionFor(result: FeedbackResult): 'up' | 'down' | null {
  if (result === 'later' || result === 'more' || result === 'longer') return 'up';
  if (result === 'earlier' || result === 'fewer' || result === 'shorter') return 'down';
  return null;
}

export type ClueCell = { key: keyof BookleFeedback; label: string; value: string; tone: FeedbackTone; direction: 'up' | 'down' | null; a11y: string };

const directionWords: Partial<Record<FeedbackResult, string>> = {
  earlier: 'the answer is earlier',
  later: 'the answer is later',
  more: 'the answer has more words',
  fewer: 'the answer has fewer words',
  longer: 'the answer is longer',
  shorter: 'the answer is shorter',
};

function describe(label: string, value: string, result: FeedbackResult): string {
  if (result === 'match') return `${label}: ${value}, correct`;
  if (result === 'partial') return `${label}: ${value}, close`;
  if (result === 'unknown') return `${label}: not enough data`;
  return `${label}: ${value}, ${directionWords[result] ?? 'not a match'}`;
}

/** Turn raw server feedback into display cells, in a fixed order. */
export function bookleCells(f: BookleFeedback): ClueCell[] {
  const cells: Omit<ClueCell, 'a11y'>[] = [
    { key: 'decade', label: 'Decade', value: f.decade.value == null ? '—' : `${f.decade.value}s`, tone: toneFor(f.decade.result), direction: directionFor(f.decade.result) },
    { key: 'genre', label: 'Genre', value: f.genre.value ?? '—', tone: toneFor(f.genre.result), direction: null },
    { key: 'nationality', label: 'Author from', value: countryName(f.nationality.value), tone: toneFor(f.nationality.result), direction: null },
    { key: 'title_words', label: 'Title words', value: String(f.title_words.value), tone: toneFor(f.title_words.result), direction: directionFor(f.title_words.result) },
    { key: 'length', label: 'Length', value: f.length.value == null ? '—' : PAGE_BANDS[f.length.value] ?? '—', tone: toneFor(f.length.result), direction: directionFor(f.length.result) },
    { key: 'author', label: 'Author', value: f.author.value ?? '—', tone: toneFor(f.author.result), direction: null },
  ];
  return cells.map((c) => ({ ...c, a11y: describe(c.label, c.value, f[c.key].result) }));
}

/** Cover Reveal: fraction of the cover shown for a given number of hints. */
export function visibleFraction(hintsUsed: number, finished: boolean): number {
  if (finished) return 1;
  return [0.2, 0.4, 0.6, 0.8][Math.max(0, Math.min(3, hintsUsed))];
}

/** Which tiles of an N×N grid are uncovered. Deterministic for a challenge. */
export function revealedTiles(challenge: Pick<CoverRevealChallenge, 'payload'>, hintsUsed: number, finished: boolean, grid = 5): Set<number> {
  const total = grid * grid;
  const order = seededShuffle(
    Array.from({ length: total }, (_, i) => i),
    challenge.payload.reveal_seed,
  );
  const count = Math.round(total * visibleFraction(hintsUsed, finished));
  return new Set(order.slice(0, count));
}

export function coverRevealScore(hintsUsed: number, correct: boolean): number {
  return correct ? 100 - hintsUsed * 25 : 0;
}

const squares: Record<FeedbackTone, string> = { match: '🟩', close: '🟨', miss: '⬜', unknown: '⬜' };

/**
 * Spoiler-free share text. Emoji are used only in the text people paste
 * elsewhere, never as interface icons.
 */
export function bookleShareText(dateKey: string, answers: GameAnswer[], won: boolean): string {
  const rows = answers
    .filter((a) => a.feedback)
    .map((a) => (a.is_correct ? '🟩🟩🟩🟩🟩🟩' : bookleCells(a.feedback as BookleFeedback).map((c) => squares[c.tone]).join('')));
  return [`GriMore Bookle ${dateKey} ${won ? answers.length : 'X'}/6`, ...rows].join('\n');
}

export function coverShareText(dateKey: string, hintsUsed: number, won: boolean): string {
  const blocks = Array.from({ length: 4 }, (_, i) => (i < hintsUsed ? '▫️' : '▪️')).join('');
  return `GriMore Cover Reveal ${dateKey}\n${won ? `Named with ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : 'Stumped today'} ${blocks}`;
}

export function quizShareText(dateKey: string, won: boolean): string {
  return `GriMore Literary Quiz ${dateKey}\n${won ? 'Correct on the first try' : 'Learned something new'}`;
}
