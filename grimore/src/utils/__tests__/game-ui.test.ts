import { applyLocks, coverLevel, fold, letterInMask, maskWords, moveUnlocked, shareText } from '../game-ui';

describe('game helpers', () => {
  it('folds accents and case', () => {
    expect(fold('Misérables')).toBe('MISERABLES');
  });

  it('finds revealed letters ignoring accents', () => {
    expect(letterInMask('Les Mis_rables', 'e')).toBe(true);
    expect(letterInMask('Le_ M__é_____', 'e')).toBe(true);
    expect(letterInMask('___', 'a')).toBe(false);
  });

  it('splits masks into words', () => {
    expect(maskWords('The ____ of')).toEqual([['T', 'h', 'e'], ['_', '_', '_', '_'], ['o', 'f']]);
  });

  it('clamps cover levels', () => {
    expect(coverLevel(0)).toEqual({ blur: 24, zoom: 3.4 });
    expect(coverLevel(9)).toEqual({ blur: 0, zoom: 1 });
  });

  it('moves items around locked slots', () => {
    const locked = [null, 'b', null];
    expect(moveUnlocked(['a', 'b', 'c'], 0, 1, locked)).toEqual(['c', 'b', 'a']);
    expect(moveUnlocked(['a', 'b', 'c'], 1, 1, locked)).toEqual(['a', 'b', 'c']);
    expect(moveUnlocked(['a', 'b', 'c'], 0, -1, locked)).toEqual(['a', 'b', 'c']);
  });

  it('applies locks keeping the free order', () => {
    expect(applyLocks(['c', 'a', 'b', 'd'], [null, 'b', null, null])).toEqual(['c', 'b', 'a', 'd']);
  });

  it('shares without spoilers', () => {
    expect(shareText('Hangman', 3, true, 75, 2)).toBe('Grimore Hangman #3 · 1:15\n🟧🟧🟩');
    expect(shareText('Clues', 1, false, null, 5)).toContain('not this time');
  });
});
