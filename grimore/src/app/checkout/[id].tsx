import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChatCircleDotsIcon, ShieldCheckIcon } from '@/components/icons';
import { Btn, Cover, Press, Screen, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { conditionLabel, getListing, money } from '@/services/market';
import { openConversation, sendMessage } from '@/services/messages';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const l = useQuery({ queryKey: ['listing', id], queryFn: () => getListing(id) });
  const [ship, setShip] = useState<'post' | 'hand'>('post');
  const d = l.data;
  const price = d?.price_cents ?? 0;
  const shipping = ship === 'post' ? 310 : 0;
  const fee = 70;
  const total = price + shipping + fee;
  const contact = async () => {
    try {
      const conv = await openConversation(d!.seller_id);
      await sendMessage({ conversationId: conv, senderId: me, listingId: id, body: `Hi! I would like to buy ${d!.book?.title ?? 'this book'} (${ship === 'post' ? 'by post' : 'in person'}).` });
      router.replace({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      toast(toAppError(e).message);
    }
  };
  const row = (k: string, v: number) => (
    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text variant="callout" tone="muted">
        {k}
      </Text>
      <Text variant="callout">{money(v, d?.currency)}</Text>
    </View>
  );
  return (
    <Screen title="Checkout" large={false} back>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
          <Cover uri={d?.book?.cover_url} title={d?.book?.title ?? ''} width={48} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {d?.book?.title}
            </Text>
            <Text variant="small" tone="muted">
              {d ? `${conditionLabel(d.condition)} · sold by ${(d.seller?.display_name ?? d.seller?.username ?? '').split(' ')[0]}` : ' '}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15 }}>{money(price, d?.currency)}</Text>
        </View>
        <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
          Delivery
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(
            [
              ['post', 'Post', `2 to 3 days · ${money(310)}`],
              ['hand', 'In person', `${d?.city ?? 'Nearby'} · free`],
            ] as const
          ).map(([v, t, s]) => (
            <Press key={v} onPress={() => setShip(v)} style={{ flex: 1, borderRadius: radius.card, borderWidth: 2, borderColor: ship === v ? colors.accent : colors.line, backgroundColor: ship === v ? colors.accentSoft : colors.surface, padding: spacing.base }}>
              <Text variant="bodyStrong">{t}</Text>
              <Text variant="caption" tone="muted">
                {s}
              </Text>
            </Press>
          ))}
        </View>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          {row('Book', price)}
          {row('Delivery', shipping)}
          {row('Buyer protection', fee)}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md, marginTop: spacing.sm }}>
            <Text variant="bodyStrong">Total</Text>
            <Text variant="bodyStrong">{money(total, d?.currency)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xs }}>
          <ShieldCheckIcon size={18} weight="fill" color={colors.good} />
          <Text variant="small" tone="muted" style={{ flex: 1 }}>
            In-app payments with full refunds if the book never arrives are coming soon. For now, message the seller to agree on payment and delivery.
          </Text>
        </View>
        <Btn size="lg" variant="inverse" full disabled>
          {`Pay ${money(total, d?.currency)} · Coming soon`}
        </Btn>
        <Btn size="lg" full icon={<ChatCircleDotsIcon size={18} color={colors.onAccent} />} onPress={contact}>
          Message the seller instead
        </Btn>
      </View>
    </Screen>
  );
}
