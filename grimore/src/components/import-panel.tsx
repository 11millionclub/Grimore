import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { ArrowRightIcon, FileArrowUpIcon } from '@/components/icons';
import { Press, Progress, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { importEreader, parseKindleClippings, readKoboDatabase } from '@/services/ereaders';
import { importRows, rowsFromExport } from '@/services/imports';
import { radius, spacing, useTheme } from '@/theme';

/** Kindle highlights, Kobo library, and Goodreads / StoryGraph CSV imports, with live progress. */
export function ImportPanel({ onDone }: { onDone?: (added: number) => void }) {
  const { colors } = useTheme();
  const me = useMyId();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const pickEreader = async (device: 'kindle' | 'kobo') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const file = await fetch(res.assets[0].uri);
      setProgress({ done: 0, total: 1 });
      const data = device === 'kindle' ? parseKindleClippings(await file.text()) : await readKoboDatabase(await file.blob());
      if (!data.books.length) {
        setProgress(null);
        return toast(device === 'kindle' ? 'No highlights found. Pick documents/My Clippings.txt from the Kindle.' : 'No opened books found in that Kobo library.');
      }
      const result = await importEreader(me!, data, { overwrite: device === 'kobo' }, (done, total) => setProgress({ done, total }));
      await qc.invalidateQueries();
      setProgress(null);
      toast(`${result.books} books and ${result.quotes} highlights imported from ${device === 'kindle' ? 'Kindle' : 'Kobo'}`);
      onDone?.(result.books);
    } catch (e) {
      setProgress(null);
      toast(toAppError(e).message);
    }
  };

  const pick = async (expected: 'goodreads' | 'storygraph') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await (await fetch(res.assets[0].uri)).text();
      const { source, rows } = rowsFromExport(text);
      if (!rows.length) return toast(`That file does not look like a ${expected === 'goodreads' ? 'Goodreads' : 'StoryGraph'} export.`);
      setProgress({ done: 0, total: rows.length });
      const { added } = await importRows(me!, rows, (done) => setProgress({ done, total: rows.length }));
      await qc.invalidateQueries();
      toast(`${added} books imported from ${source === 'storygraph' ? 'StoryGraph' : 'Goodreads'}`);
      setProgress(null);
      onDone?.(added);
    } catch (e) {
      setProgress(null);
      toast(toAppError(e).message);
    }
  };

  if (progress)
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md }}>
        <Text variant="title">Importing your library</Text>
        <Progress value={progress.done / progress.total} />
        <Text variant="small" tone="muted">
          {progress.done} of {progress.total} books
        </Text>
      </View>
    );

  return (
    <View style={{ gap: spacing.sm }}>
      {(
        [
          ['kindle', 'Kindle highlights', 'My Clippings.txt: books and every highlight'],
          ['kobo', 'Kobo library', 'KoboReader.sqlite: status, progress, highlights'],
          ['goodreads', 'Import from Goodreads', 'CSV export with shelves and ratings'],
          ['storygraph', 'Import from StoryGraph', 'CSV export with read status and ratings'],
        ] as const
      ).map(([id, title, sub]) => (
        <Press key={id} onPress={() => (id === 'kindle' || id === 'kobo' ? pickEreader(id) : pick(id))} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <FileArrowUpIcon size={22} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" style={{ fontSize: 16 }}>
              {title}
            </Text>
            <Text variant="small" tone="muted">
              {sub}
            </Text>
          </View>
          <ArrowRightIcon size={18} weight="bold" color={colors.muted} />
        </Press>
      ))}
      <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.xs, marginTop: spacing.xs }}>
        Amazon and Kobo do not let other apps sign in to your account, so Grimore reads the files your e-reader keeps. Connect it to a computer by USB (or
        copy the file to your phone). Kindle: documents/My Clippings.txt. Kobo: the hidden .kobo folder, KoboReader.sqlite. Goodreads: My Books, Import and
        export, Export library. StoryGraph: Manage account, Export StoryGraph library.
      </Text>
    </View>
  );
}
