type Entry = { status: 'want_to_read' | 'reading' | 'read' | 'on_hold' | 'dnf'; is_owned: boolean };

export type LibraryFilter = 'all' | 'read' | 'reading' | 'owned' | 'want' | 'wishlist';
export const LIBRARY_FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'read', label: 'Finished' },
  { id: 'reading', label: 'Reading' },
  { id: 'want', label: 'TBR' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'owned', label: 'Owned' },
];

/**
 * All = Finished + Reading + TBR + Wishlist. Owned = the books you own that are
 * on your TBR, being read or finished. TBR = want to read and owned;
 * Wishlist = want to read, not owned yet.
 */
export function inFilter(e: Entry, filter: LibraryFilter) {
  const want = e.status === 'want_to_read';
  switch (filter) {
    case 'read':
      return e.status === 'read';
    case 'reading':
      return e.status === 'reading';
    case 'want':
      return want && e.is_owned;
    case 'wishlist':
      return want && !e.is_owned;
    case 'owned':
      return e.is_owned && (want || e.status === 'reading' || e.status === 'read');
    default:
      return want || e.status === 'reading' || e.status === 'read';
  }
}

