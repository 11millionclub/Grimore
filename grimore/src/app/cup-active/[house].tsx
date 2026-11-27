import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Sigil } from '@/components/sigil';
import { Avatar, EmptyState, Press, Screen, Skeleton, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { houseContributors } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_NAMES, isHouseId, themedHouse } from '@/theme/houses';

/** Everyone in a House who earned it points this season: the "active" members the Cup divides by. */
export default function CupActive() {
  const { house } = useLocalSearchParams<{ house: string }>();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const { t } = useTranslation();
  const h = isHouseId(house) ? house : 'wanderers';
  const q = useQuery({ queryKey: ['cupActive', h], queryFn: () => houseContributors(h) });
  const tk = themedHouse(h, dark);
  const d = q.data;
  return (
    <Screen title={t('cup.activeTitle', { house: HOUSE_NAMES[h] })} back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Sigil house={h} size={24} color={tk.onPrimary} label={false} />
          </View>
          <Text variant="small" tone="muted" style={{ flex: 1 }}>
            {t('cup.activeBody')} {d ? t('cup.active', { n: d.total }) : ''}
          </Text>
        </View>
        {q.isLoading ? [0, 1, 2].map((k) => <Skeleton key={k} height={56} rounded={radius.card} />) : null}
        {d && d.total === 0 ? <EmptyState title={t('cup.activeNone')} /> : null}
        {(d?.members ?? []).map((m) => (
          <Press
            key={m.user_id}
            accessibilityLabel={`${m.display_name ?? m.username}${m.points != null ? `, ${m.points} points` : ''}`}
            onPress={() => router.push({ pathname: '/user/[username]', params: { username: m.username } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}
          >
            <Avatar uri={m.avatar_url} name={m.display_name ?? m.username} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {m.display_name ?? m.username}
              </Text>
              <Text variant="caption" tone="muted">
                @{m.username}
              </Text>
            </View>
            {m.points != null ? (
              <Text style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }} color={tk.ink}>
                {m.points}
              </Text>
            ) : null}
          </Press>
        ))}
        {d && d.hidden > 0 ? (
          <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
            {t('cup.activeHidden', { n: d.hidden })}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
