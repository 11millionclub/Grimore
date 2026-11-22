import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Toggle } from '@/components/switch';
import { MinusIcon, PlusIcon } from '@/components/icons';
import { Btn, Cover, IconBtn, Press, Sheet, Slider, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getBook } from '@/services/catalogue';
import { getEntry, logProgress, saveEntry, statusPatch } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function ProgressSheet() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) });
  const entry = useQuery({ queryKey: ['library', 'entry', bookId], queryFn: () => getEntry(me, bookId) });
  const total = entry.data?.book.page_count_estimate ?? book.data?.page_count_estimate ?? 400;
  const start = entry.data?.current_page ?? 0;
  const [page, setPage] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [share, setShare] = useState(false);
  const current = page ?? start;
  const set = (p: number) => setPage(Math.max(0, Math.min(total, Math.round(p))));
  const delta = current - start;

  const save = useMutation({
    mutationFn: async () => {
      const r = await logProgress({ bookId, page: current, note, share });
      if (r.total && current >= r.total) await saveEntry(me, bookId, statusPatch('read', entry.data));
      return r;
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['library'] });
      void qc.invalidateQueries({ queryKey: ['streak'] });
      void qc.invalidateQueries({ queryKey: ['readingStats'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      router.back();
      if (r.total && current >= r.total) {
        toast(`You finished ${book.data?.title ?? 'the book'}!`);
        setTimeout(() => router.push({ pathname: '/review/[bookId]', params: { bookId } }), 400);
      } else toast(delta > 0 ? `+${delta} pages today` : 'Progress saved');
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

        <View style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconBtn label="One page back" size={48} filled onPress={() => set(current - 1)}>
            <MinusIcon size={20} weight="bold" color={colors.ink} />
          </IconBtn>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 64, lineHeight: 66, fontVariant: ['tabular-nums'] }}>{current}</Text>
            <Text variant="small" tone="muted">
              of {total} · {Math.round((current / Math.max(1, total)) * 100)}%
            </Text>
          </View>
          <IconBtn label="One page forward" size={48} filled onPress={() => set(current + 1)}>
            <PlusIcon size={20} weight="bold" color={colors.ink} />
          </IconBtn>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Slider value={current} min={0} max={total} onChange={set} label="Current page" />
        </View>

        <View style={{ marginTop: spacing.base, flexDirection: 'row', gap: spacing.sm }}>
          {[10, 25, 50].map((n) => (
            <Press key={n} onPress={() => set(current + n)} style={{ flex: 1, height: 36, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="callout" style={{ fontFamily: fonts.semibold }}>
                +{n}
              </Text>
            </Press>
          ))}
          <Press onPress={() => set(total)} style={{ flex: 1, height: 36, borderRadius: radius.full, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="callout" tone="accent" style={{ fontFamily: fonts.semibold }}>
              Finished
            </Text>
          </Press>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <TextField label="Session note (optional)" value={note} onChangeText={setNote} placeholder="What stayed with you from this chapter?" multiline maxLength={2000} />
        </View>
        <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text variant="body" style={{ flex: 1 }}>
            Share to my feed
          </Text>
          <Toggle value={share} onChange={setShare} label="Share to my feed" />
        </View>

        <Btn size="lg" full disabled={delta === 0 && !note.trim()} loading={save.isPending} onPress={() => save.mutate()} style={{ marginTop: spacing.base }}>
          {delta === 0 ? (note.trim() ? 'Save note' : 'No changes') : `Save ${delta > 0 ? '+' : ''}${delta} pages`}
        </Btn>
      </View>
    </Sheet>
  );
}
