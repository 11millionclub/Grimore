import { ageBand, ageOn, breakdown, decide, DAILY_POINT_CAP, gamePoints, scoreAnswers, shuffle, suggestedTieBreak, type Answers } from '../sorting';

const all = (h: 'lantern' | 'quill' | 'thorn' | 'hourglass'): Answers => ({ q1: h, q2: h, q3: h, q4: h, q5: h, q6: h, q7: h, q8: h });

describe('scoring', () => {
  it('gives 2 points per answer', () => {
    expect(scoreAnswers(all('thorn'))).toEqual({ lantern: 0, quill: 0, thorn: 16, hourglass: 0 });
  });

  it('assigns the top House when the gap is more than 2', () => {
    const r = decide({ q1: 'lantern', q2: 'lantern', q3: 'lantern', q4: 'lantern', q5: 'thorn', q6: 'quill', q7: 'quill', q8: 'hourglass' });
    expect(r).toMatchObject({ kind: 'clear', house: 'lantern' });
  });

  it('is "torn between two" when the gap is 2 or less', () => {
    const r = decide({ q1: 'lantern', q2: 'lantern', q3: 'lantern', q4: 'thorn', q5: 'thorn', q6: 'quill', q7: 'quill', q8: 'hourglass' });
    expect(r).toMatchObject({ kind: 'torn', top: ['lantern', 'quill'] });
  });

  it('needs the tie-breaker when two Houses share first place', () => {
    const r = decide({ q1: 'lantern', q2: 'lantern', q3: 'lantern', q4: 'thorn', q5: 'thorn', q6: 'thorn', q7: 'quill', q8: 'hourglass' });
    expect(r).toMatchObject({ kind: 'tie', tied: ['lantern', 'thorn'] });
  });

  it('handles a four-way tie', () => {
    const r = decide({ q1: 'lantern', q2: 'lantern', q3: 'quill', q4: 'quill', q5: 'thorn', q6: 'thorn', q7: 'hourglass', q8: 'hourglass' });
    expect(r.kind).toBe('tie');
    if (r.kind === 'tie') expect(r.tied).toHaveLength(4);
  });
});

describe('breakdown', () => {
  it('turns scores into percentages that add up to 100', () => {
    const rows = breakdown({ lantern: 6, quill: 2, thorn: 6, hourglass: 2 });
    expect(rows.reduce((a, r) => a + r.pct, 0)).toBe(100);
    expect(rows[0]).toEqual({ house: 'lantern', pct: 38 });
  });
  it('is empty when nothing was answered', () => {
    expect(breakdown({ lantern: 0, quill: 0, thorn: 0, hourglass: 0 })).toEqual([]);
  });
});

describe('soft balance', () => {
  it('suggests the less crowded tied House only when one is over 35 %', () => {
    expect(suggestedTieBreak(['lantern', 'thorn'], { lantern: 0.5, thorn: 0.1 })).toBe('thorn');
    expect(suggestedTieBreak(['lantern', 'thorn'], { lantern: 0.3, thorn: 0.2 })).toBeNull();
  });
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
