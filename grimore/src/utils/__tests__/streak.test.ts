import { applyCompletion, effectiveStreak, streakAtRisk, xpForDay, xpForGame, type StreakState } from '../streak';

const empty: StreakState = { current: 0, longest: 0, lastActive: null };

describe('streak rules (mirror of private.finish_attempt)', () => {
  it('starts at 1 on the first completed day', () => {
    expect(applyCompletion(empty, '2026-11-15')).toEqual({ current: 1, longest: 1, lastActive: '2026-11-15' });
  });

  it('does not change when a second game is completed on the same day', () => {
    const s = applyCompletion(empty, '2026-11-15');
    expect(applyCompletion(s, '2026-11-15')).toBe(s);
  });

  it('extends on consecutive days, including across month and year boundaries', () => {
    let s = applyCompletion(empty, '2026-12-30');
    s = applyCompletion(s, '2026-12-31');
    s = applyCompletion(s, '2027-01-01');
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('restarts at 1 after a missed day but keeps the longest streak', () => {
    let s = applyCompletion(empty, '2026-11-01');
    s = applyCompletion(s, '2026-11-02');
    s = applyCompletion(s, '2026-11-03');
    s = applyCompletion(s, '2026-11-05');
    expect(s).toEqual({ current: 1, longest: 3, lastActive: '2026-11-05' });
  });

  it('never rewinds when an older day is applied', () => {
    const s = applyCompletion(empty, '2026-11-10');
    expect(applyCompletion(s, '2026-11-09')).toBe(s);
  });

  it('shows a broken streak as 0 once a full day is missed', () => {
    const s: StreakState = { current: 5, longest: 9, lastActive: '2026-11-13' };
    expect(effectiveStreak(s, '2026-11-14')).toBe(5);
    expect(effectiveStreak(s, '2026-11-15')).toBe(0);
    expect(effectiveStreak(empty, '2026-11-15')).toBe(0);
  });

  it('flags a streak that has not yet been extended today', () => {
    const s: StreakState = { current: 4, longest: 4, lastActive: '2026-11-14' };
    expect(streakAtRisk(s, '2026-11-15')).toBe(true);
    expect(streakAtRisk(s, '2026-11-14')).toBe(false);
  });
});

describe('XP', () => {
  it('gives 15 XP per daily game', () => {
    expect(xpForGame('hangman')).toBe(15);
    expect(xpForGame('timeline')).toBe(15);
  });

  it('adds the Perfect Day bonus only when all four are completed', () => {
    expect(xpForDay(['hangman'])).toBe(15);
    expect(xpForDay(['hangman', 'cover', 'clues'])).toBe(45);
    expect(xpForDay(['hangman', 'cover', 'clues', 'timeline'])).toBe(75);
  });

  it('never double-counts the same game', () => {
    expect(xpForDay(['hangman', 'hangman', 'hangman'])).toBe(15);
  });
});
