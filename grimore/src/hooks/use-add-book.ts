import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ShelfChoice } from '@/components/shelf-picker';
import { toast } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { importBook, type ExternalBook } from '@/services/books';
import { addToShelf, getEntry, saveEntry, STATUS_META, type ReadingStatus } from '@/services/library';

import { useMyId } from './queries';

/** Resolve a catalogue id for an external result (imports it once). */
export async function resolveBookId(b: { id?: string; external?: ExternalBook }) {
  if (b.id) return b.id;
  if (b.external) return importBook(b.external);
  throw new Error('No book');
}

type AddInput = { book: { id?: string; external?: ExternalBook; title: string }; status?: ReadingStatus; choice?: ShelfChoice; owned?: boolean };

/**
 * Puts a book on a reading status (Want to read, Reading, Read…) or on one of
 * the reader's own shelves. A book added to a custom shelf that is not yet in
 * the library also lands in Want to read, so it shows up everywhere.
 */
export function useAddToLibrary() {
  const me = useMyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ book, status, choice, owned }: AddInput) => {
      const id = await resolveBookId(book);
      const pick: ShelfChoice = choice ?? { kind: 'status', status: status ?? 'want_to_read' };
      if (pick.kind === 'shelf') {
        await addToShelf(pick.shelfId, id);
        if (!(await getEntry(me!, id))) await saveEntry(me!, id, { status: 'want_to_read', ...(owned ? { is_owned: true } : {}) });
        return { id, title: book.title, label: pick.title };
      }
      const today = new Date().toISOString().slice(0, 10);
      await saveEntry(me!, id, {
        status: pick.status,
        ...(owned ? { is_owned: true } : {}),
        ...(pick.status === 'reading' ? { started_on: today } : {}),
        ...(pick.status === 'read' ? { finished_on: today } : {}),
      });
      return { id, title: book.title, label: STATUS_META[pick.status].label };
    },
    onSuccess: ({ title, label }) => {
      toast(`${title} added to ${label}`);
      void qc.invalidateQueries({ queryKey: ['library'] });
      void qc.invalidateQueries({ queryKey: ['shelves'] });
      void qc.invalidateQueries({ queryKey: ['readingStats'] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
}
