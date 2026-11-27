import { router } from 'expo-router';
import { View } from 'react-native';

import { EyeSlashIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Press, Text } from '@/components/ui';
import { useMyHouse, useMyId, useReaderHouses } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_NAMES, themedHouse } from '@/theme/houses';

/**
 * A reader's House on their profile: sigil, "One of the Seekers" and the
 * motto; opens the House's Common Room. Other readers only see it when it is not hidden (reader_houses
 * already filters); the owner always sees it, with a note when hidden.
 */
export function HousePlate({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const me = useMyId();
  const mine = userId === me;
  const own = useMyHouse();
  const others = useReaderHouses(mine ? [] : [userId]);
  const house = mine ? own.data?.house : others.data?.[userId];
  if (!house) return null;
  const tk = themedHouse(house, dark);
  const name = HOUSE_NAMES[house];
  return (
    <Press
      accessibilityRole="link"
      accessibilityLabel={t('profile.member', { member: t(`houses.${house}.member`), house: name })}
      onPress={() => router.push({ pathname: '/common-room/[house]', params: { house } })}
      style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.tile, borderWidth: 1, borderColor: tk.primary + '55', backgroundColor: tk.primary + '14', paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Sigil house={house} size={22} color={tk.onPrimary} label={false} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="small" style={{ fontFamily: fonts.semibold }} color={tk.ink} numberOfLines={1}>
          {t('profile.member', { member: t(`houses.${house}.member`), house: name })}
        </Text>
        <Text variant="callout" style={{ fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 20 }} tone="muted" numberOfLines={2}>
          {t(`houses.${house}.motto`)}
        </Text>
        {mine && own.data?.hidden ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <EyeSlashIcon size={12} color={colors.faint} />
            <Text variant="caption" tone="faint">
              {t('profile.houseHidden')}
            </Text>
          </View>
        ) : null}
      </View>
    </Press>
  );
}
