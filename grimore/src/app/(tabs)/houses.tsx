import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppActions } from '@/components/app-actions';
import { PointsLink } from '@/components/house-cup-card';
import { CaretRightIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Btn, EmptyState, Press, Screen, Segmented, Text } from '@/components/ui';
import { useMyHouse } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_IDS, HOUSE_NAMES, houseTokens } from '@/theme/houses';

import { HouseView } from '../house';
import { HouseCupView } from '../house-cup';

type Tab = 'cup' | 'house' | 'rooms';

/** Everything about the Houses in one tab: the House Cup, your House, and the four common rooms. */
export default function HousesTab() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const mine = useMyHouse();
  const h = mine.data?.house ?? null;
  const [tab, setTab] = useState<Tab>('cup');
  const refresh = () => Promise.all(['standings', 'duels', 'myHousePoints', 'seasons', 'myHouse', 'ritual', 'myItems', 'wallet'].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  return (
    <Screen title="Houses" tabs actions={<AppActions />} refreshing={false} onRefresh={refresh}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'cup', label: t('cup.title') },
            { value: 'house', label: 'My House' },
            { value: 'rooms', label: 'Common rooms' },
          ]}
        />
      </View>
      <Animated.View key={tab} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
        {tab === 'cup' ? (
          <HouseCupView embedded />
        ) : tab === 'house' ? (
          h ? (
            <>
              <HouseView embedded />
              <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
                <PointsLink />
              </View>
            </>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              <EmptyState title="You have no House yet" body="Take the Sorting to find the House that reads like you." />
              <Btn full onPress={() => router.push('/sorting')}>
                Take the Sorting
              </Btn>
            </View>
          )
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {HOUSE_IDS.map((id) => {
              const tk = houseTokens[id];
              return (
                <Press
                  key={id}
                  accessibilityLabel={`${HOUSE_NAMES[id]} common room${id === h ? ', your House' : ''}`}
                  onPress={() => router.push({ pathname: '/common-room/[house]', params: { house: id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, backgroundColor: tk.primary, padding: spacing.base, borderWidth: id === h ? 2 : 0, borderColor: colors.gold }}
                >
                  <Sigil house={id} size={40} color={tk.onPrimary} label={false} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 22 }} color={tk.onPrimary}>
                      {HOUSE_NAMES[id]}
                    </Text>
                    <Text variant="caption" color={tk.onPrimary} style={{ opacity: 0.85 }}>
                      {id === h ? 'Your common room' : t(`houses.${id}.motto`)}
                    </Text>
                  </View>
                  <CaretRightIcon size={16} color={tk.onPrimary} />
                </Press>
              );
            })}
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}
