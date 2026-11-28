import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { MinusIcon, PlusIcon } from '@/components/icons';
import { Btn, Cover, IconBtn, Press, Segmented, Sheet, Slider, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { getBook } from '@/services/catalogue';
import { FORMATS, getEntry, logProgress, logProgressPercent, saveEntry, statusPatch, type ReadingFormat } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function ProgressSheet() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) });
  const entry = useQuery({ queryKey: ['library', 'entry', bookId], queryFn: () => getEntry(me, bookId) });
  const total = entry.data?.book.page_count_estimate ?? book.data?.page_count_estimate ?? 400;
  // Ebooks and audiobooks are tracked in %, print books in pages.
  const [formatPick, setFormat] = useState<ReadingFormat | null>(null);
  const format: ReadingFormat = formatPick ?? entry.data?.format ?? 'print';
  const byPercent = format !== 'print';
  const max = byPercent ? 100 : total;
  const start = byPercent ? (entry.data?.progress_percent ?? 0) : (entry.data?.current_page ?? 0);
  const [value, setValue] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const current = value ?? start;
  const set = (p: number) => setValue(Math.max(0, Math.min(max, Math.round(p))));
  const delta = current - start;
  const unit = byPercent ? '%' : delta === 1 || delta === -1 ? 'page' : 'pages';
  const pickFormat = (f: ReadingFormat) => {
    setFormat(f);
    setValue(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (entry.data && format !== entry.data.format) await saveEntry(me, bookId, { format });
      const done = current >= max;
      const r = byPercent ? await logProgressPercent({ bookId, percent: current, note }) : await logProgress({ bookId, page: current, note });
      if (formatPick && !entry.data) await saveEntry(me, bookId, { format });
      if (done) await saveEntry(me, bookId, statusPatch('read', entry.data));
      return { ...r, done };
    },
    onSuccess: (r) => {
      void refreshLibrary(qc);
      void qc.invalidateQueries({ queryKey: ['streak'] });
      void qc.invalidateQueries({ queryKey: ['readingStats'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      router.back();
      if (r.done) {
        toast(`You finished ${book.data?.title ?? 'the book'}!`);
        setTimeout(() => router.push({ pathname: '/review/[bookId]', params: { bookId } }), 400);
      } else toast(delta > 0 ? (byPercent ? `+${delta}% today` : `+${delta} pages today`) : 'Progress saved');
    },
    onError: (e) => toast(toAppError(e).message),
  });

  return (
    <Sheet>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Cover uri={book.data?.cover_url} title={book.data?.title ?? ''} width={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title" numberOfLines={1}>
              {book.data?.title ?? ' '}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={1}>
              {book.data?.authorsLine}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Segmented value={format} onChange={pickFormat} options={FORMATS.map((f) => ({ value: f.id, label: f.label }))} />
        </View>

        <View style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconBtn label={byPercent ? 'One percent back' : 'One page back'} size={48} filled onPress={() => set(current - 1)}>
            <MinusIcon size={20} weight="bold" color={colors.ink} />
          </IconBtn>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 64, lineHeight: 66, fontVariant: ['tabular-nums'] }}>
              {current}
              {byPercent ? '%' : ''}
            </Text>
            <Text variant="small" tone="muted">
              {byPercent ? (format === 'audio' ? 'of the audiobook' : 'of the ebook') : `of ${total} · ${Math.round((current / Math.max(1, total)) * 100)}%`}
            </Text>
          </View>
          <IconBtn label={byPercent ? 'One percent forward' : 'One page forward'} size={48} filled onPress={() => set(current + 1)}>
            <PlusIcon size={20} weight="bold" color={colors.ink} />
          </IconBtn>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Slider value={current} min={0} max={max} onChange={set} label={byPercent ? 'Progress in percent' : 'Current page'} />
        </View>

        <View style={{ marginTop: spacing.base, flexDirection: 'row', gap: spacing.sm }}>
          {(byPercent ? [5, 10, 25] : [10, 25, 50]).map((n) => (
            <Press key={n} onPress={() => set(current + n)} style={{ flex: 1, height: 36, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="callout" style={{ fontFamily: fonts.semibold }}>
                +{n}
                {byPercent ? '%' : ''}
              </Text>
            </Press>
          ))}
          <Press onPress={() => set(max)} style={{ flex: 1, height: 36, borderRadius: radius.full, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="callout" tone="accent" style={{ fontFamily: fonts.semibold }}>
              Finished
            </Text>
          </Press>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <TextField label="Session note (optional)" value={note} onChangeText={setNote} placeholder="What stayed with you from this chapter?" multiline maxLength={2000} />
        </View>

        <Btn size="lg" full disabled={delta === 0 && !note.trim() && !formatPick} loading={save.isPending} onPress={() => save.mutate()} style={{ marginTop: spacing.base }}>
          {delta === 0 ? (note.trim() || formatPick ? 'Save' : 'No changes') : `Save ${delta > 0 ? '+' : ''}${delta}${byPercent ? '%' : ` ${unit}`}`}
        </Btn>
      </View>
    </Sheet>
  );
}
