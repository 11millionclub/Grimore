import { cleanIsbn, isbn10to13, isValidIsbn, mergeResults, normalizeTitle, toUpsertPayload } from '../normalize';
import type { ExternalBook } from '../types';

describe('ISBN handling', () => {
  it('validates ISBN-10 and ISBN-13 check digits', () => {
    expect(isValidIsbn('0-306-40615-2')).toBe(true);
    expect(isValidIsbn('978-0-306-40615-7')).toBe(true);
    expect(isValidIsbn('0-8044-2957-X')).toBe(true);
    expect(isValidIsbn('978-0-306-40615-8')).toBe(false);
    expect(isValidIsbn('12345')).toBe(false);
    expect(isValidIsbn('X-306-40615-2')).toBe(false);
  });

  it('cleans and converts ISBN-10 to ISBN-13', () => {
    expect(cleanIsbn(' 0-306-40615-2 ')).toBe('0306406152');
    expect(isbn10to13('0306406152')).toBe('9780306406157');
    expect(isbn10to13('0306406153')).toBeNull();
  });
});

describe('title normalisation', () => {
  it('ignores case, punctuation and accents', () => {
    expect(normalizeTitle('Les Misérables')).toBe('les miserables');
    expect(normalizeTitle('Mrs. Dalloway')).toBe(normalizeTitle('Mrs Dalloway'));
    expect(normalizeTitle('  The Hobbit: or There and Back Again ')).toBe('the hobbit or there and back again');
  });
});

const ol = (over: Partial<ExternalBook>): ExternalBook => ({ source: 'open_library', sourceId: 'x', title: 'Untitled', authors: [], ...over });
const gb = (over: Partial<ExternalBook>): ExternalBook => ({ source: 'google_books', sourceId: 'y', title: 'Untitled', authors: [], ...over });

describe('mergeResults — one work, many editions', () => {
  it('merges records that share an ISBN, filling gaps from later providers', () => {
    const merged = mergeResults([
      [ol({ title: 'Blindness', authors: ['José Saramago'], isbn13: '9780156007757', openLibraryWorkKey: 'OL1W' })],
      [gb({ title: 'Blindness', authors: ['Jose Saramago'], isbn13: '9780156007757', coverUrl: 'https://img', pageCount: 326, googleVolumeId: 'G1' })],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ source: 'open_library', coverUrl: 'https://img', pageCount: 326, googleVolumeId: 'G1', openLibraryWorkKey: 'OL1W' });
  });

  it('matches an ISBN-10 against the equivalent ISBN-13', () => {
    const merged = mergeResults([[ol({ title: 'A', authors: ['B'], isbn10: '0306406152' })], [gb({ title: 'A different title', authors: ['C'], isbn13: '9780306406157' })]]);
    expect(merged).toHaveLength(1);
  });

  it('merges exact title + first author matches across providers', () => {
    const merged = mergeResults([[ol({ title: 'Mrs. Dalloway', authors: ['Virginia Woolf'], firstPublishedYear: 1925 })], [gb({ title: 'Mrs Dalloway', authors: ['Virginia Woolf'], firstPublishedYear: 2003 })]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].firstPublishedYear).toBe(1925);
  });

  it('keeps genuinely different books apart', () => {
    const merged = mergeResults([[ol({ title: 'Emma', authors: ['Jane Austen'] }), ol({ title: 'Emma', authors: ['Emma Donoghue'], sourceId: 'z' })]]);
    expect(merged).toHaveLength(2);
  });
});

describe('toUpsertPayload', () => {
  it('sends identifiers and attribution for the cover', () => {
    const payload = toUpsertPayload(gb({ title: 'Dune', authors: ['Frank Herbert'], isbn13: '9780441013593', googleVolumeId: 'B1', coverUrl: 'https://c' }));
    expect(payload.identifiers).toEqual([
      { type: 'isbn_13', value: '9780441013593' },
      { type: 'google_volume', value: 'B1' },
    ]);
    expect(payload.cover_source).toBe('google_books');
  });
});
