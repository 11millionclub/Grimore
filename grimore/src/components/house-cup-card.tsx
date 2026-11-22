import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { CaretRightIcon, TrophyIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Press, Text } from '@/components/ui';
import { useMyHouse } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { getStandings } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_IDS, HOUSE_NAMES, houseTokens } from '@/theme/houses';

/** Compact House Cup standings on the Play tab: the games are where points come from. */
export function HouseCupCard() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const mine = useMyHouse();
  const standings = useQuery({ queryKey: ['standings'], queryFn: () => getStandings(), staleTime: 5 * 60_000 });
  const rows = standings.data?.length ? standings.data : HOUSE_IDS.map((house) => ({ house, perMember: 0 }));
  const lead = standings.data?.find((r) => r.perMember > 0);
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={t('cup.open')}
      onPress={() => {
        track('house_cup_viewed', { from: 'play' });
        router.push('/house-cup');
      }}
      style={{ backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.gold, padding: spacing.base, gap: spacing.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TrophyIcon size={20} weight="fill" color={colors.gold} />
        <Text variant="h2" style={{ flex: 1, fontSize: 15 }}>
          {t('cup.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {lead ? t('cup.leading', { house: HOUSE_NAMES[lead.house] }) : ''}
        </Text>
        <CaretRightIcon size={14} color={colors.muted} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {rows.map((r) => {
          const tk = houseTokens[r.house];
          const me = r.house === mine.data?.house;
          return (
            <View key={r.house} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: radius.tile, backgroundColor: me ? tk.primary : colors.surface2 }}>
              <Sigil house={r.house} size={20} color={me ? tk.onPrimary : tk.ink} label={false} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontVariant: ['tabular-nums'] }} color={me ? tk.onPrimary : colors.ink}>
                {r.perMember}
              </Text>
              <Text variant="micro" color={me ? tk.onPrimary : colors.muted}>
                {HOUSE_NAMES[r.house].toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>
    </Press>
  );
}
