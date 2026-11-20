import { router } from 'expo-router';
import { View } from 'react-native';

import { ArrowsLeftRightIcon } from '@/components/icons';
import { Cover, Press, Text } from '@/components/ui';
import { conditionLabel, money, type Listing } from '@/services/market';
import { fonts, radius, spacing, useTheme } from '@/theme';

export function ListingTile({ l }: { l: Listing }) {
  const { colors } = useTheme();
  return (
    <Press onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}>
      <View style={{ aspectRatio: 4 / 5, borderRadius: radius.card, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ transform: [{ rotate: '-2deg' }] }}>
          <Cover uri={l.book?.cover_url} title={l.book?.title ?? ''} author={l.book?.authors} width={96} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16 }}>{l.mode === 'trade' ? 'Trade' : money(l.price_cents, l.currency)}</Text>
        {l.mode === 'both' ? <ArrowsLeftRightIcon size={14} color={colors.muted} title="Also trades" /> : null}
      </View>
      <Text variant="small" style={{ fontFamily: fonts.medium }} numberOfLines={1}>
        {l.book?.title}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {conditionLabel(l.condition)}
        {l.city ? ` · ${l.city}` : ''}
      </Text>
    </Press>
  );
}
