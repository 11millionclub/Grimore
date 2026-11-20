import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { importBook, type ExternalBook } from '@/services/books';
import { saveEntry, STATUS_META, type ReadingStatus } from '@/services/library';

import { useMyId } from './queries';

/** Resolve a catalogue id for an external result (imports it once). */
export async function resolveBookId(b: { id?: string; external?: ExternalBook }) {
  if (b.id) return b.id;
  if (b.external) return importBook(b.external);
  throw new Error('No book');
}

export function useAddToLibrary() {
  const me = useMyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ book, status = 'want_to_read', owned }: { book: { id?: string; external?: ExternalBook; title: string }; status?: ReadingStatus; owned?: boolean }) => {
      const id = await resolveBookId(book);
      await saveEntry(me!, id, { status, ...(owned ? { is_owned: true } : {}), ...(status === 'reading' ? { started_on: new Date().toISOString().slice(0, 10) } : {}) });
      return { id, title: book.title, status };
    },
    onSuccess: ({ title, status }) => {
      toast(`${title} added to ${STATUS_META[status].label}`);
      void qc.invalidateQueries({ queryKey: ['library'] });
      void qc.invalidateQueries({ queryKey: ['readingStats'] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
}
