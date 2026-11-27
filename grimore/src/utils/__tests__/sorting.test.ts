import { applyTieBreak, breakdown, DAILY_POINT_CAP, decide, gamePoints, isComplete, percentages, scoreAnswers, shuffle, ageBand, ageOn, type Answers } from '../sorting';
import { QUIZ, TIE_BREAKERS, tieBreakerFor, VECTOR_ORDER } from '../sorting-quiz';

/**
 * Appendix A of the House Sorting specification, copied independently of the
 * quiz data, so a typo in either place fails the build.
 * Order: [Wanderers, Weavers, Luminaries, Seekers].
 */
const APPENDIX: Record<string, Record<'a' | 'b' | 'c' | 'd', number[]>> = {
  q1: { a: [0, 0, 10, 20], b: [0, 0, 20, 5], c: [5, 20, 0, 0], d: [20, 0, 5, 5] },
  q2: { a: [0, 20, 0, 0], b: [5, 0, 5, 20], c: [15, 5, 0, 0], d: [0, 0, 20, 5] },
  q3: { a: [5, 0, 20, 5], b: [0, 5, 5, 15], c: [20, 0, 0, 5], d: [0, 20, 0, 0] },
  q4: { a: [0, 0, 20, 5], b: [5, 20, 0, 0], c: [0, 0, 10, 20], d: [20, 0, 5, 5] },
  q5: { a: [20, 5, 0, 0], b: [0, 0, 5, 20], c: [0, 20, 0, 0], d: [0, 0, 20, 5] },
  q6: { a: [0, 20, 0, 0], b: [0, 0, 20, 10], c: [10, 0, 10, 20], d: [10, 10, 5, 5] },
  q7: { a: [0, 0, 10, 20], b: [5, 15, 10, 0], c: [20, 0, 5, 5], d: [0, 0, 20, 5] },
  q8: { a: [20, 0, 0, 5], b: [0, 0, 20, 0], c: [0, 0, 5, 20], d: [0, 15, 5, 0] },
  q9: { a: [0, 20, 0, 5], b: [20, 5, 0, 0], c: [0, 0, 20, 5], d: [0, 0, 10, 20] },
  q10: { a: [0, 0, 20, 5], b: [20, 0, 0, 5], c: [0, 20, 0, 5], d: [0, 0, 5, 20] },
  q11: { a: [15, 10, 0, 0], b: [0, 20, 0, 5], c: [0, 0, 20, 10], d: [0, 0, 5, 20] },
  q12: { a: [20, 0, 5, 0], b: [0, 0, 20, 5], c: [0, 0, 5, 20], d: [0, 20, 0, 0] },
};
const TB_APPENDIX: [string, string, string][] = [
  ['wanderers|weavers', 'weavers', 'wanderers'],
  ['wanderers|luminaries', 'wanderers', 'luminaries'],
  ['wanderers|seekers', 'wanderers', 'seekers'],
  ['weavers|luminaries', 'weavers', 'luminaries'],
  ['weavers|seekers', 'weavers', 'seekers'],
  ['luminaries|seekers', 'luminaries', 'seekers'],
];

const all = (id: 'a' | 'b' | 'c' | 'd'): Answers => Object.fromEntries(QUIZ.map((q) => [q.id, id]));

describe('quiz content', () => {
  it('has 12 questions of 4 answers in the approved order', () => {
    expect(QUIZ.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12']);
    for (const q of QUIZ) expect(q.options.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('matches all 48 answer vectors of Appendix A', () => {
    for (const q of QUIZ) for (const o of q.options) expect([q.id, o.id, o.v]).toEqual([q.id, o.id, APPENDIX[q.id][o.id]]);
  });
  it('has the six pair tie-breakers, each answer for its own House', () => {
    expect(Object.keys(TIE_BREAKERS).sort()).toEqual(TB_APPENDIX.map((x) => x[0]).sort());
    for (const [pair, a, b] of TB_APPENDIX) {
      expect(TIE_BREAKERS[pair].options.map((o) => o.house)).toEqual([a, b]);
      const [x, y] = pair.split('|') as [never, never];
      expect(tieBreakerFor(y, x)).toBe(TIE_BREAKERS[pair]);
    }
  });
});

describe('scoring', () => {
  it('adds each answer vector to the House totals', () => {
    expect(scoreAnswers(all('a'))).toEqual({ wanderers: 80, weavers: 75, luminaries: 85, seekers: 65 });
    expect(scoreAnswers({ q1: 'd' })).toEqual({ wanderers: 20, weavers: 0, luminaries: 5, seekers: 5 });
    expect(isComplete(all('b'))).toBe(true);
    expect(isComplete({ q1: 'a' })).toBe(false);
  });
  it('finds a clear winner from unrounded scores', () => {
    const d = decide(all('a'));
    expect(d.kind).toBe('clear');
    if (d.kind === 'clear') expect(d.house).toBe('luminaries');
  });
  it('asks the pair tie-breaker when exactly two Houses share the top score, and adds 20 to the chosen one', () => {
    // q1 c [5,20,0,0] + q2 d [0,0,20,5] -> weavers 20, luminaries 20.
    const d = decide({ q1: 'c', q2: 'd' });
    expect(d.kind).toBe('pair');
    if (d.kind !== 'pair') return;
    expect(d.pair).toEqual(['weavers', 'luminaries']);
    const r = applyTieBreak(d.scores, d.pair, 'b');
    expect(r.house).toBe('luminaries');
    expect(r.scores).toEqual({ ...d.scores, luminaries: 40 });
  });
  it('tests both answers of every tie-breaker', () => {
    for (const [pair, a, b] of TB_APPENDIX) {
      const [x, y] = pair.split('|') as [never, never];
      const base = { wanderers: 10, weavers: 10, luminaries: 10, seekers: 10, [x]: 30, [y]: 30 };
      expect(applyTieBreak(base, [x, y], 'a').house).toBe(a);
      expect(applyTieBreak(base, [x, y], 'b').house).toBe(b);
      expect(applyTieBreak(base, [x, y], 'a').scores[a as 'seekers']).toBe(50);
    }
  });
  it('never picks a winner for three- or four-way ties', () => {
    expect(decide({}).kind).toBe('multi');
    const d = decide({ q1: 'c', q2: 'd', q3: 'c' }); // weavers 20, luminaries 20, wanderers 25 -> clear
    expect(d.kind).toBe('clear');
    const three = decide({ q1: 'b', q2: 'a', q3: 'c' }); // [20,20,20,10]
    expect(three.kind).toBe('multi');
    if (three.kind === 'multi') expect(three.tied).toEqual(['wanderers', 'weavers', 'luminaries']);
  });
});

describe('percentages', () => {
  it('shares the combined score and always shows 100 in total', () => {
    const p = percentages({ wanderers: 1, weavers: 1, luminaries: 1, seekers: 0 });
    expect(p.wanderers + p.weavers + p.luminaries + p.seekers).toBe(100);
    expect(p).toEqual({ wanderers: 34, weavers: 33, luminaries: 33, seekers: 0 });
    const q = percentages(scoreAnswers(all('a')));
    expect(Object.values(q).reduce((a, b) => a + b, 0)).toBe(100);
    // 80/305, 75/305, 85/305, 65/305 = 26.2, 24.6, 27.9, 21.3 -> largest remainders go to Luminaries and Weavers.
    expect(q).toEqual({ wanderers: 26, weavers: 25, luminaries: 28, seekers: 21 });
  });
  it('lists all four Houses, highest first, even at 0 %', () => {
    const rows = breakdown({ wanderers: 0, weavers: 60, luminaries: 0, seekers: 40 });
    expect(rows.map((r) => r.house)).toEqual(['weavers', 'seekers', 'wanderers', 'luminaries']);
    expect(rows.map((r) => r.pct)).toEqual([60, 40, 0, 0]);
  });
  it('is all zero when nothing was answered', () => {
    expect(percentages({ wanderers: 0, weavers: 0, luminaries: 0, seekers: 0 })).toEqual({ wanderers: 0, weavers: 0, luminaries: 0, seekers: 0 });
  });
});

describe('option shuffling', () => {
  it('moves each answer text with its own vector', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const q of QUIZ) {
      const shuffled = shuffle(q.options, rnd);
      for (const o of shuffled) expect(o.v).toEqual(APPENDIX[q.id][o.id]);
    }
  });
});

it('vector order is Wanderers, Weavers, Luminaries, Seekers', () => {
  expect(VECTOR_ORDER).toEqual(['wanderers', 'weavers', 'luminaries', 'seekers']);
});

describe('shuffle', () => {
  it('keeps every item', () => {
    let s = 1;
    const seeded = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    expect(shuffle(['a', 'b', 'c', 'd'], seeded).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('age', () => {
  it('computes age and the safety band', () => {
    const today = new Date(Date.UTC(2026, 10, 23));
    expect(ageOn(new Date(Date.UTC(2013, 10, 24)), today)).toBe(12);
    expect(ageBand(12)).toBe('under13');
    expect(ageBand(15)).toBe('teen');
    expect(ageBand(16)).toBe('adult');
  });
});

describe('House Cup points', () => {
  it('awards a full first game: play, solve, all four, streak', () => {
    const p = gamePoints({ solved: true, secondsElapsed: 40, allFourToday: true, streakDays: 3, alreadyToday: 0 });
    expect(p.reduce((a, x) => a + x.points, 0)).toBe(10 + 10 + 15 + 6);
  });
  it('gives no solve points for impossibly fast solves', () => {
    const p = gamePoints({ solved: true, secondsElapsed: 2, allFourToday: false, streakDays: 0, alreadyToday: 0 });
    expect(p.find((x) => x.action === 'solve')).toBeUndefined();
  });
  it('caps the streak bonus at 20', () => {
    const p = gamePoints({ solved: false, secondsElapsed: 60, allFourToday: false, streakDays: 30, alreadyToday: 0 });
    expect(p.find((x) => x.action === 'streak')?.points).toBe(20);
  });
  it('never goes past the daily cap', () => {
    const p = gamePoints({ solved: true, secondsElapsed: 60, allFourToday: true, streakDays: 10, placementPct: 0.05, alreadyToday: DAILY_POINT_CAP - 12 });
    expect(p.reduce((a, x) => a + x.points, 0)).toBe(12);
  });
  it('a perfect day stays at or under 175', () => {
    let today = 0;
    for (let g = 0; g < 4; g++) {
      const p = gamePoints({ solved: true, secondsElapsed: 60, allFourToday: g === 3, streakDays: 30, placementPct: 0.01, alreadyToday: today });
      today += p.reduce((a, x) => a + x.points, 0);
    }
    expect(today).toBeLessThanOrEqual(DAILY_POINT_CAP);
  });
});
