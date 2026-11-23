import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CommunityCover } from '@/components/books';
import { Btn, Press, Sheet, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getCommunity, joinCommunity } from '@/services/communities';
import { money } from '@/utils/money';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function JoinSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ['community', id], queryFn: () => getCommunity(id) });
  const d = c.data;
  const price = d?.price_cents ?? null;
  const options = price
    ? [
        { id: 'visitor', name: 'Visitor', price: 0, desc: 'Public posts and the reading calendar' },
        { id: 'circle', name: 'Member', price, desc: 'Every discussion, live sessions, guides and the banner for My Grimore' },
      ]
    : [{ id: 'member', name: 'Member', price: 0, desc: 'Access to every discussion' }];
  const [sel, setSel] = useState<string | null>(null);
  const chosen = options.find((o) => o.id === (sel ?? options[0].id))!;
  const join = useMutation({
    mutationFn: () => joinCommunity(id, me, !!price),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community', id] });
      void qc.invalidateQueries({ queryKey: ['my-communities'] });
      router.back();
      toast(`Welcome to ${d?.name}`);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <Sheet>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.tile, overflow: 'hidden' }}>{d ? <CommunityCover c={d} height={48} /> : null}</View>
          <View>
            <Text variant="small" tone="muted">
              Join
            </Text>
            <Text variant="title">{d?.name}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {options.map((o) => {
            const on = chosen.id === o.id;
            return (
              <Press key={o.id} onPress={() => setSel(o.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, borderWidth: 2, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface2, padding: spacing.base }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                    {o.name}
                  </Text>
                  <Text variant="small" tone="muted">
                    {o.desc}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 17 }}>{o.price ? money(o.price) : 'Free'}</Text>
              </Press>
            );
          })}
        </View>
        {chosen.price ? (
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.base }}>
            Paid memberships are coming soon. You can join as a Visitor now and upgrade when payments open; your support will go straight to {d?.host?.display_name?.split(' ')[0] ?? 'the host'} and the community.
          </Text>
        ) : null}
        <Btn
          size="lg"
          full
          style={{ marginTop: spacing.lg }}
          disabled={!!chosen.price}
          loading={join.isPending}
          onPress={() => join.mutate()}
        >
          {chosen.price ? `${chosen.name} · ${money(chosen.price)}/month · Coming soon` : price ? 'Join as a Visitor' : 'Join for free'}
        </Btn>
      </View>
    </Sheet>
  );
}
