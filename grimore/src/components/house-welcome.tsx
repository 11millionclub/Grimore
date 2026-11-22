import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { XIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { IconBtn, Text } from '@/components/ui';
import { useMyHouse } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { fonts, radius, spacing } from '@/theme';
import { HOUSE_NAMES, houseTokens } from '@/theme/houses';

const useDismissed = create<{ at: string | null; dismiss: (at: string) => void }>()(
  persist((set) => ({ at: null, dismiss: (at) => set({ at }) }), { name: 'grimore-house-welcome', storage: createJSONStorage(() => AsyncStorage) }),
);

/** "Welcome to House X" on Home for the first week, until dismissed. */
export function HouseWelcomeCard() {
  const { t } = useTranslation();
  const house = useMyHouse();
  const dismissedAt = useDismissed((s) => s.at);
  const dismiss = useDismissed((s) => s.dismiss);
  const h = house.data?.house;
  const at = house.data?.assignedAt;
  const [openedAt] = useState(() => Date.now());
  if (!h || !at || dismissedAt === at || openedAt - new Date(at).getTime() > 7 * 86_400_000) return null;
  const tk = houseTokens[h];
  return (
    <Animated.View exiting={FadeOut} style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
      <View style={{ backgroundColor: tk.primary, borderRadius: radius.card, padding: spacing.base, flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Sigil house={h} size={40} color={tk.onPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24 }} color={tk.onPrimary}>
            {t('sorting.welcomeCard.title', { house: HOUSE_NAMES[h] })}
          </Text>
          <Text variant="small" color={tk.onPrimary}>
            {t('sorting.welcomeCard.body', { ritual: t(`houses.${h}.ritual`) })}
          </Text>
        </View>
        <IconBtn label={t('common.close')} size={36} onPress={() => dismiss(at)}>
          <XIcon size={16} color={tk.onPrimary} />
        </IconBtn>
      </View>
    </Animated.View>
  );
}
