import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { CoinsIcon, CopySimpleIcon, GameControllerIcon, TagIcon } from '@/components/icons';
import { Btn, Press, Screen, SectionHead, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getWallet, listRewards, myRedemptions, redeem, type Reward } from '@/services/points';
import { myItems } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

const ask = (title: string, body: string) =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === 'web') return resolve(globalThis.confirm?.(`${title}\n\n${body}`) ?? false);
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Redeem', onPress: () => resolve(true) },
    ]);
  });

/** Your points: earned in the daily games, spent on My Grimore items and shop discounts. */
export default function Points() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const rewards = useQuery({ queryKey: ['rewards'], queryFn: listRewards });
  const history = useQuery({ queryKey: ['redemptions', me], queryFn: () => myRedemptions(me) });
  const owned = useQuery({ queryKey: ['myItems', me], queryFn: () => myItems(me) });
  const [lastCode, setLastCode] = useState<string | null>(null);
  const balance = wallet.data?.balance ?? 0;
  const ownedKeys = new Set((owned.data ?? []).map((x) => x.item_key));

  const go = useMutation({
    mutationFn: (r: Reward) => redeem(r.id),
    onSuccess: (res, r) => {
      for (const key of ['wallet', 'redemptions', 'myItems', 'shop']) void qc.invalidateQueries({ queryKey: [key] });
      if (res.code) setLastCode(res.code);
      toast(r.kind === 'corner_item' ? `${r.title} is yours. Find it in My Grimore.` : 'Discount code ready');
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const tryRedeem = async (r: Reward) => {
    if (await ask(r.title, `Spend ${r.cost_points} of your ${balance} points? Your House Cup points stay the same.`)) go.mutate(r);
  };
  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    toast('Code copied');
  };

  const card = { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base } as const;
  const row = (r: Reward) => {
    const have = r.item_key ? ownedKeys.has(r.item_key) : false;
    const short = balance < r.cost_points;
    return (
      <View key={r.id} style={[card, { flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          {r.kind === 'shop_discount' ? <TagIcon size={20} color={colors.accent} /> : <CoinsIcon size={20} color={colors.accent} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {r.title}
          </Text>
          <Text variant="caption" tone="muted">
            {r.cost_points} points{r.description ? ` · ${r.description}` : ''}
          </Text>
        </View>
        <Btn size="sm" variant={have || short ? 'secondary' : 'primary'} disabled={have || short || go.isPending} onPress={() => void tryRedeem(r)}>
          {have ? 'Owned' : 'Redeem'}
        </Btn>
      </View>
    );
  };
  const items = (rewards.data ?? []).filter((r) => r.kind === 'corner_item');
  const discounts = (rewards.data ?? []).filter((r) => r.kind === 'shop_discount');
  const titleOf = (id: string) => rewards.data?.find((r) => r.id === id)?.title ?? id;

  return (
    <Screen title="My points" back refreshing={wallet.isRefetching} onRefresh={() => Promise.all([wallet.refetch(), history.refetch()])}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <View style={[card, { alignItems: 'center', gap: 4, borderColor: colors.gold }]}>
          {wallet.isLoading ? (
            <Skeleton width={120} height={40} />
          ) : (
            <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 52 }} tone="accent">
              {balance}
            </Text>
          )}
          <Text variant="small" tone="muted">
            points to spend · {wallet.data?.earned ?? 0} earned, {wallet.data?.spent ?? 0} spent
          </Text>
        </View>
        <View style={[card, { flexDirection: 'row', gap: spacing.md }]}>
          <GameControllerIcon size={22} color={colors.muted} />
          <Text variant="small" tone="muted" style={{ flex: 1 }}>
            Every point you win in the daily games counts twice: for your House in the Cup, and here for you. Spending only lowers this balance, never your House.
          </Text>
        </View>
        {lastCode ? (
          <Press onPress={() => void copy(lastCode)} style={[card, { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: colors.accent }]}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Your code: {lastCode}
            </Text>
            <CopySimpleIcon size={18} color={colors.accent} />
          </Press>
        ) : null}
      </View>

      {discounts.length ? (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHead title="Shop discounts" />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>{discounts.map(row)}</View>
        </View>
      ) : null}

      {items.length ? (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHead title="For My Grimore" />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>{items.map(row)}</View>
        </View>
      ) : null}

      {(history.data ?? []).length ? (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHead title="What you redeemed" />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {(history.data ?? []).map((h) => (
              <Press key={h.id} disabled={!h.code} onPress={() => h.code && void copy(h.code)} style={[card, { flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {titleOf(h.reward_id)}
                  </Text>
                  <Text variant="caption" tone="muted">
                    −{h.points} points · {relativeTime(h.created_at)}
                    {h.code ? ` · ${h.code}` : ''}
                  </Text>
                </View>
                {h.code ? <CopySimpleIcon size={16} color={colors.muted} /> : null}
              </Press>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
