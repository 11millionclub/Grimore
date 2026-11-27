import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { SortingFlow } from '@/components/onboarding/sorting';
import { EmptyState, Screen, toast } from '@/components/ui';
import { t } from '@/i18n';
import { canTakeSorting } from '@/services/houses';
import { useTheme } from '@/theme';
import { HOUSE_NAMES } from '@/theme/houses';

/** Readers sorted by the earlier quiz take the current Sorting Quiz once. */
export default function ResortScreen() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const can = useQuery({ queryKey: ['canTakeSorting'], queryFn: canTakeSorting });
  if (can.isLoading)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  if (!can.data)
    return (
      <Screen title={t('house.title')} back>
        <EmptyState title={t('house.resortDone')} />
      </Screen>
    );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SortingFlow
        stepOffset={0}
        stepTotal={1}
        onBack={() => router.back()}
        onDone={(house) => {
          toast(t('sorting.welcomeCard.title', { house: HOUSE_NAMES[house] }));
          for (const key of ['myHouse', 'sorting', 'canTakeSorting', 'standings', 'readerHouses', 'myItems', 'ritual', 'corner']) void qc.invalidateQueries({ queryKey: [key] });
          router.back();
        }}
      />
    </View>
  );
}
