import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BookOpenIcon, CheckIcon } from '@/components/icons';
import { Toggle } from '@/components/switch';
import { Btn, Chip, Cover, Press, Segmented, Sheet, Text, TextField, toast } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { listByStatus } from '@/services/library';
import { CONDITIONS, createListing, money, type Condition } from '@/services/market';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function SellSheet() {
  const params = useLocalSearchParams<{ bookId?: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const profile = useMyProfile();
  const qc = useQueryClient();
  const books = useQuery({ queryKey: ['sellable', me], queryFn: async () => [...(await listByStatus(me, 'owned', 200)), ...(await listByStatus(me, 'read', 200)), ...(await listByStatus(me, 'dnf', 50))].filter((e, i, a) => a.findIndex((x) => x.book.id === e.book.id) === i) });
  const [pick, setPick] = useState<string | null>(params.bookId ?? null);
  const [mode, setMode] = useState<'sale' | 'trade' | 'both'>('both');
  const [cond, setCond] = useState<Condition>('very_good');
  const [price, setPrice] = useState('8');
  const [edition, setEdition] = useState('');
  const [note, setNote] = useState('');
  const [rare, setRare] = useState(false);
  const chosen = (books.data ?? []).find((e) => e.book.id === (pick ?? books.data?.[0]?.book.id));
  const cents = Math.round(Number(price.replace(',', '.')) * 100);
  const valid = !!chosen && (mode === 'trade' || (Number.isFinite(cents) && cents >= 0));
  const publish = useMutation({
    mutationFn: () =>
      createListing({ sellerId: me, bookId: chosen!.book.id, userBookId: chosen!.id, mode, priceCents: mode === 'trade' ? null : cents, condition: cond, edition, note, isRare: rare, city: profile.data?.city }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['market'] });
      router.back();
      toast(`${chosen?.book.title} is on the Market`);
      setTimeout(() => router.push({ pathname: '/listing/[id]', params: { id: r.id } }), 80);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <Sheet title="Sell or trade" subtitle="Pick from your shelves.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, paddingBottom: spacing.sm, gap: spacing.md }}>
        {(books.data ?? []).length === 0 && !books.isLoading ? (
          <Text variant="callout" tone="muted">
            Add books you own or have read first.
          </Text>
        ) : (
          (books.data ?? []).map((e) => {
            const on = chosen?.book.id === e.book.id;
            return (
              <Press key={e.id} onPress={() => setPick(e.book.id)} style={{ opacity: on ? 1 : 0.5 }}>
                <Cover uri={e.book.cover_url} title={e.book.title} width={72} />
                {on ? (
                  <View style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={12} weight="bold" color={colors.onAccent} />
                  </View>
                ) : null}
              </Press>
            );
          })
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, gap: spacing.lg }}>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'sale', label: 'Sell' }, { value: 'trade', label: 'Trade' }, { value: 'both', label: 'Both' }]} />
        {mode !== 'trade' ? (
          <View>
            <TextField label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" right={<Text tone="muted">€</Text>} />
            {cents > 0 ? (
              <View style={{ marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', borderRadius: radius.tile, backgroundColor: colors.surface2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                <Text variant="small" tone="muted">
                  You will receive, after the 8% fee
                </Text>
                <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                  {money(Math.round(cents * 0.92))}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View>
          <Text variant="small" tone="muted">
            Condition
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 6 }}>
            {CONDITIONS.map((c) => (
              <Chip key={c.value} active={cond === c.value} onPress={() => setCond(c.value)}>
                {c.label}
              </Chip>
            ))}
          </View>
        </View>
        <TextField label="Edition (optional)" value={edition} onChangeText={setEdition} maxLength={140} placeholder="Publisher, year, hardback…" />
        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} placeholder="Read once, no underlining. Prefer to swap for fantasy." />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text style={{ flex: 1 }}>Rare edition</Text>
          <Toggle value={rare} onChange={setRare} label="Rare edition" />
        </View>
        <Btn size="lg" full disabled={!valid} loading={publish.isPending} icon={<BookOpenIcon size={18} weight="bold" color={colors.onAccent} />} onPress={() => publish.mutate()}>
          Publish listing
        </Btn>
      </View>
    </Sheet>
  );
}
