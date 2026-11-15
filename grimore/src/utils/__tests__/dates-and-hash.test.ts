import { addDays, daysBetween, formatCountdown, msUntilNextChallenge, utcDateKey } from '../dates';
import { hashString, seededShuffle } from '../hash';

describe('challenge day (UTC)', () => {
  it('uses the UTC calendar date regardless of local time zone', () => {
    // 23:30 in New York on 14 Nov is already 15 Nov in UTC.
    expect(utcDateKey(new Date('2026-11-15T04:30:00Z'))).toBe('2026-11-15');
    expect(utcDateKey(new Date('2026-11-14T23:59:59Z'))).toBe('2026-11-14');
  });

  it('adds and diffs days across month, year and leap boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14);
    expect(daysBetween('2026-11-15', '2026-11-14')).toBe(-1);
  });

  it('counts down to the next UTC midnight', () => {
    const ms = msUntilNextChallenge(new Date('2026-11-15T22:15:00Z'));
    expect(ms).toBe(105 * 60 * 1000);
    expect(formatCountdown(ms)).toBe('1h 45m');
    expect(formatCountdown(5 * 60 * 1000)).toBe('5m');
  });
});

describe('deterministic visuals', () => {
  it('hashes stably', () => {
    expect(hashString('GriMore')).toBe(hashString('GriMore'));
    expect(hashString('GriMore')).not.toBe(hashString('Grimore'));
  });

  it('shuffles the same way for the same seed and keeps every item', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const a = seededShuffle(items, 42);
    expect(seededShuffle(items, 42)).toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(seededShuffle(items, 43)).not.toEqual(a);
  });
});
