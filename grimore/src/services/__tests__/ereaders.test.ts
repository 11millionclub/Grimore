import { parseKindleClippings, readableAuthor } from '../ereaders';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const SAMPLE = [
  '﻿Beloved (Morrison, Toni)',
  '- Your Highlight on page 12 | Location 170-171 | Added on Monday, 3 March 2025 21:04:11',
  '',
  'Definitions belong to the definers',
  '==========',
  'Beloved (Morrison, Toni)',
  '- Your Highlight on page 12 | Location 170-172 | Added on Monday, 3 March 2025 21:05:02',
  '',
  'Definitions belong to the definers, not the defined.',
  '==========',
  'Ensaio sobre a Cegueira (José Saramago)',
  '- O seu marcador na página 40 | posição 600 | Adicionado: segunda-feira, 3 de março de 2025 22:00:00',
  '',
  '',
  '==========',
  'Ensaio sobre a Cegueira (José Saramago)',
  '- O seu destaque na página 41 | posição 610-612 | Adicionado: segunda-feira, 3 de março de 2025 22:01:00',
  '',
  'Se podes olhar, vê. Se podes ver, repara.',
  '==========',
  'Good Omens (Pratchett, Terry; Gaiman, Neil)',
  '- Your Highlight at location 99-100 | Added on Tuesday, 4 March 2025 10:00:00',
  '',
  'Just remember: you can be good',
  '==========',
  'Good Omens (Pratchett, Terry; Gaiman, Neil)',
  '- Your Highlight at location 99-100 | Added on Tuesday, 4 March 2025 10:00:00',
  '',
  'Just remember: you can be good',
  '==========',
  '',
].join('\r\n');

describe('parseKindleClippings', () => {
  const out = parseKindleClippings(SAMPLE);

  it('finds each book once, with readable authors', () => {
    expect(out.books.map((b) => [b.title, b.authors])).toEqual([
      ['Beloved', ['Toni Morrison']],
      ['Ensaio sobre a Cegueira', ['José Saramago']],
      ['Good Omens', ['Terry Pratchett', 'Neil Gaiman']],
    ]);
    expect(out.books.every((b) => b.status === 'read')).toBe(true);
  });

  it('keeps the extended highlight, drops bookmarks and repeats, in any device language', () => {
    expect(out.highlights).toEqual([
      { title: 'Beloved', author: 'Toni Morrison', text: 'Definitions belong to the definers, not the defined.' },
      { title: 'Ensaio sobre a Cegueira', author: 'José Saramago', text: 'Se podes olhar, vê. Se podes ver, repara.' },
      { title: 'Good Omens', author: 'Terry Pratchett', text: 'Just remember: you can be good' },
    ]);
  });

  it('shortens highlights to the quote limit', () => {
    const long = parseKindleClippings(`Book (A)\n- meta\n\n${'x'.repeat(900)}\n==========\n`);
    expect(long.highlights[0].text.length).toBe(600);
    expect(long.highlights[0].text.endsWith('…')).toBe(true);
  });

  it('returns nothing for an unrelated file', () => {
    expect(parseKindleClippings('title,author\nA,B\n')).toEqual({ books: [], highlights: [] });
  });
});

describe('readableAuthor', () => {
  it('turns "Last, First" around', () => {
    expect(readableAuthor('Morrison, Toni')).toBe('Toni Morrison');
    expect(readableAuthor('Toni Morrison')).toBe('Toni Morrison');
  });
});
