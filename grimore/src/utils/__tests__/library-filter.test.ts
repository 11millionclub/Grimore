import { inFilter } from '@/utils/library-filter';

const e = (status: 'want_to_read' | 'reading' | 'read' | 'on_hold' | 'dnf', is_owned: boolean) => ({ status, is_owned });

describe('library filters', () => {
  it('TBR is owned want-to-read; Wishlist is the rest', () => {
    expect(inFilter(e('want_to_read', true), 'want')).toBe(true);
    expect(inFilter(e('want_to_read', false), 'want')).toBe(false);
    expect(inFilter(e('want_to_read', false), 'wishlist')).toBe(true);
    expect(inFilter(e('want_to_read', true), 'wishlist')).toBe(false);
  });
  it('All is Finished + Reading + TBR + Wishlist', () => {
    for (const s of ['want_to_read', 'reading', 'read'] as const) expect(inFilter(e(s, false), 'all')).toBe(true);
    expect(inFilter(e('dnf', true), 'all')).toBe(false);
    expect(inFilter(e('on_hold', true), 'all')).toBe(false);
  });
  it('Owned is owned TBR, Reading and Finished', () => {
    for (const s of ['want_to_read', 'reading', 'read'] as const) expect(inFilter(e(s, true), 'owned')).toBe(true);
    expect(inFilter(e('read', false), 'owned')).toBe(false);
    expect(inFilter(e('dnf', true), 'owned')).toBe(false);
  });
});
