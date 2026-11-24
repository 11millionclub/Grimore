import { groupSagas, parseSeries, spineTitle } from '../sagas';

describe('sagas', () => {
  it('reads the series from Goodreads-style titles', () => {
    expect(parseSeries('Heir of Fire (Throne of Glass, #3)')).toEqual({ series: 'Throne of Glass', index: 3, clean: 'Heir of Fire' });
    expect(parseSeries('Iron Flame (The Empyrean #2)')).toEqual({ series: 'The Empyrean', index: 2, clean: 'Iron Flame' });
    expect(parseSeries('Six of Crows')).toBeNull();
    expect(spineTitle('Crown of Midnight (Throne of Glass, #2)')).toBe('Crown of Midnight');
  });

  it('groups a saga in reading order and falls back to the author', () => {
    const sagas = groupSagas([
      { id: 'b', title: 'Crown of Midnight (Throne of Glass, #2)', authors: 'Sarah J. Maas' },
      { id: 'c', title: 'Six of Crows', authors: 'Leigh Bardugo', year: 2015 },
      { id: 'a', title: 'Throne of Glass (Throne of Glass, #1)', authors: 'Sarah J. Maas' },
      { id: 'd', title: 'Crooked Kingdom', authors: 'Leigh Bardugo', year: 2016 },
    ]);
    expect(sagas.map((s) => s.name)).toEqual(['Leigh Bardugo', 'Throne of Glass']);
    expect(sagas[1].books.map((b) => b.id)).toEqual(['a', 'b']);
    expect(sagas[0].books.map((b) => b.id)).toEqual(['c', 'd']);
  });
});
