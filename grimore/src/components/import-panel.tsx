import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { ArrowRightIcon, FileArrowUpIcon } from '@/components/icons';
import { Press, Progress, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { importRows, rowsFromExport } from '@/services/imports';
import { radius, spacing, useTheme } from '@/theme';

/** Goodreads / StoryGraph CSV import with live progress. */
export function ImportPanel({ onDone }: { onDone?: (added: number) => void }) {
  const { colors } = useTheme();
  const me = useMyId();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const pick = async (expected: 'goodreads' | 'storygraph') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await (await fetch(res.assets[0].uri)).text();
      const { source, rows } = rowsFromExport(text);
      if (!rows.length) return toast(`That file does not look like a ${expected === 'goodreads' ? 'Goodreads' : 'StoryGraph'} export.`);
      setProgress({ done: 0, total: rows.length });
      const added = await importRows(me!, rows, (done) => setProgress({ done, total: rows.length }));
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
          ['goodreads', 'Import from Goodreads', 'CSV export with shelves and ratings'],
          ['storygraph', 'Import from StoryGraph', 'CSV export with read status and ratings'],
        ] as const
      ).map(([id, title, sub]) => (
        <Press key={id} onPress={() => pick(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
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
        Goodreads: My Books, Import and export, Export library. StoryGraph: Manage account, Export StoryGraph library.
      </Text>
    </View>
  );
}
