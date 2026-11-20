import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ArrowsLeftRightIcon, CheckIcon } from '@/components/icons';
import { Btn, Cover, Press, Sheet, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { listByStatus } from '@/services/library';
import { getListing, makeOffer } from '@/services/market';
import { radius, spacing, useTheme } from '@/theme';

export default function TradeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const l = useQuery({ queryKey: ['listing', id], queryFn: () => getListing(id) });
  const mine = useQuery({ queryKey: ['tradeable', me], queryFn: async () => [...(await listByStatus(me, 'owned', 200)), ...(await listByStatus(me, 'read', 200))].filter((e, i, a) => a.findIndex((x) => x.book.id === e.book.id) === i) });
  const [offer, setOffer] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const send = useMutation({
    mutationFn: () => makeOffer({ listingId: id, buyerId: me, bookIds: offer, message: msg }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offers', id] });
      router.back();
      toast('Offer sent');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const picked = (mine.data ?? []).filter((e) => offer.includes(e.book.id));
  return (
    <Sheet title="Propose a trade">
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.base }}>
          <View style={{ flexDirection: 'row' }}>
            {picked.length ? (
              picked.slice(0, 3).map((e, i) => (
                <View key={e.id} style={{ marginLeft: i ? -24 : 0, transform: [{ rotate: `${(i - 1) * 6}deg` }] }}>
                  <Cover uri={e.book.cover_url} title={e.book.title} width={56} />
                </View>
              ))
            ) : (
              <View style={{ width: 56, aspectRatio: 2 / 3, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="micro" tone="faint">
                  yours
                </Text>
              </View>
            )}
          </View>
          <ArrowsLeftRightIcon size={24} color={colors.accent} />
          <Cover uri={l.data?.book?.cover_url} title={l.data?.book?.title ?? ''} width={56} />
        </View>
        <Text variant="small" tone="muted" style={{ marginTop: spacing.lg }}>
          What you offer
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        {(mine.data ?? []).length === 0 ? (
          <Text variant="callout" tone="muted">
            Mark books as owned or read to offer them.
          </Text>
        ) : (
          (mine.data ?? []).map((e) => {
            const on = offer.includes(e.book.id);
            return (
              <Press key={e.id} onPress={() => setOffer((o) => (on ? o.filter((x) => x !== e.book.id) : o.length < 5 ? [...o, e.book.id] : o))} style={{ opacity: on ? 1 : 0.55 }}>
                <Cover uri={e.book.cover_url} title={e.book.title} width={64} />
                {on ? (
                  <View style={{ position: 'absolute', right: -4, top: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={11} weight="bold" color={colors.onAccent} />
                  </View>
                ) : null}
              </Press>
            );
          })
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.base, gap: spacing.base }}>
        <TextField label="Message (optional)" value={msg} onChangeText={setMsg} multiline maxLength={1000} placeholder="Hi! Would any of these interest you?" />
        <Btn size="lg" full disabled={!offer.length} loading={send.isPending} onPress={() => send.mutate()} style={{ borderRadius: radius.full }}>
          {offer.length ? `Offer ${offer.length} for 1` : 'Pick at least one book'}
        </Btn>
      </View>
    </Sheet>
  );
}
