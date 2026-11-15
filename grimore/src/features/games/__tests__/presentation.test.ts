import { bookleCells, bookleShareText, coverRevealScore, directionFor, revealedTiles, toneFor, visibleFraction } from '../presentation';
import type { BookleFeedback, CoverRevealChallenge, GameAnswer } from '../types';

const feedback: BookleFeedback = {
  decade: { value: 1920, result: 'later' },
  genre: { value: 'Literary Fiction', result: 'match' },
  nationality: { value: 'US', result: 'miss' },
  title_words: { value: 3, result: 'fewer' },
  length: { value: 0, result: 'longer' },
  author: { value: 'F. Scott Fitzgerald', result: 'miss' },
};

describe('Bookle feedback presentation', () => {
  it('renders the six clues in a fixed order', () => {
    expect(bookleCells(feedback).map((c) => c.key)).toEqual(['decade', 'genre', 'nationality', 'title_words', 'length', 'author']);
  });

  it('maps results to tones and arrows', () => {
    expect(toneFor('match')).toBe('match');
    expect(toneFor('partial')).toBe('close');
    expect(toneFor('unknown')).toBe('unknown');
    expect(toneFor('later')).toBe('miss');
    expect(directionFor('later')).toBe('up');
    expect(directionFor('fewer')).toBe('down');
    expect(directionFor('match')).toBeNull();
  });

  it('formats values for people', () => {
    const cells = bookleCells(feedback);
    expect(cells[0].value).toBe('1920s');
    expect(cells[2].value).toBe('United States');
    expect(cells[4].value).toBe('Under 200');
  });

  it('describes each clue for screen readers', () => {
    const [decade, genre] = bookleCells(feedback);
    expect(decade.a11y).toBe('Decade: 1920s, the answer is later');
    expect(genre.a11y).toBe('Genre: Literary Fiction, correct');
  });

  it('never invents a value when data is missing', () => {
    const cells = bookleCells({ ...feedback, decade: { value: null, result: 'unknown' } });
    expect(cells[0].value).toBe('—');
    expect(cells[0].a11y).toBe('Decade: not enough data');
  });

  it('builds a spoiler-free share grid', () => {
    const answers: GameAnswer[] = [
      { position: 1, is_correct: false, selected_index: null, feedback, book: null },
      { position: 2, is_correct: true, selected_index: null, feedback, book: null },
    ];
    const text = bookleShareText('2026-11-15', answers, true);
    expect(text.split('\n')).toEqual(['GriMore Bookle 2026-11-15 2/6', '⬜🟩⬜⬜⬜⬜', '🟩🟩🟩🟩🟩🟩']);
    expect(text).not.toContain('Gatsby');
  });
});

describe('Cover Reveal', () => {
  const challenge = { payload: { reveal_seed: 123456, cover_url: '', max_hints: 3, options: [] } } as unknown as CoverRevealChallenge;

  it('reveals 20% then +20% per hint, everything when finished', () => {
    expect([0, 1, 2, 3].map((h) => visibleFraction(h, false))).toEqual([0.2, 0.4, 0.6, 0.8]);
    expect(visibleFraction(0, true)).toBe(1);
    expect(revealedTiles(challenge, 0, false).size).toBe(5);
    expect(revealedTiles(challenge, 3, false).size).toBe(20);
    expect(revealedTiles(challenge, 1, true).size).toBe(25);
  });

  it('is deterministic for everyone with the same seed, and hints only add tiles', () => {
    const a = revealedTiles(challenge, 1, false);
    const b = revealedTiles(challenge, 1, false);
    expect([...a]).toEqual([...b]);
    const before = revealedTiles(challenge, 0, false);
    [...before].forEach((t) => expect(a.has(t)).toBe(true));
  });

  it('scores fewer hints higher, and wrong answers zero', () => {
    expect([0, 1, 2, 3].map((h) => coverRevealScore(h, true))).toEqual([100, 75, 50, 25]);
    expect(coverRevealScore(0, false)).toBe(0);
  });
});
