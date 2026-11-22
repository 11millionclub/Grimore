import { router } from 'expo-router';
import { View } from 'react-native';

import { CrownSimpleIcon, MedalIcon, SealCheckIcon, StarFourIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Press, Text } from '@/components/ui';
import { t, useTranslation } from '@/i18n';
import { fonts, radius } from '@/theme';
import { HOUSE_NAMES, houseTokens, type HouseId } from '@/theme/houses';

/**
 * The House badge shown next to a reader's name. The sigil carries the
 * House on its own (no colour needed); `named` adds the House name.
 */
export function HouseBadge({ house, size = 18, named = false, link = false }: { house: HouseId | null | undefined; size?: number; named?: boolean; link?: boolean }) {
  const { t } = useTranslation();
  if (!house) return null;
  const tk = houseTokens[house];
  const dot = (
    <View
      accessibilityRole={link ? undefined : 'image'}
      accessibilityLabel={`${t('house.title')}: ${HOUSE_NAMES[house]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: size + 4,
        paddingHorizontal: named ? 8 : 0,
        width: named ? undefined : size + 4,
        justifyContent: 'center',
        borderRadius: radius.full,
        backgroundColor: tk.primary,
      }}
    >
      <Sigil house={house} size={size * 0.8} color={tk.onPrimary} label={false} />
      {named ? (
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: Math.max(10, size * 0.6), lineHeight: size }} color={tk.onPrimary}>
          {HOUSE_NAMES[house]}
        </Text>
      ) : null}
    </View>
  );
  if (!link) return dot;
  return (
    <Press accessibilityRole="link" accessibilityLabel={`${t('house.title')}: ${HOUSE_NAMES[house]}`} onPress={() => router.push({ pathname: '/common-room/[house]', params: { house } })}>
      {dot}
    </Press>
  );
}

const MARKS: Record<string, { color: string; Icon: 'ribbon' | 'laurel' | 'star' | 'ritual' }> = {
  'ribbon:season-bronze': { color: '#9a6232', Icon: 'ribbon' },
  'ribbon:season-silver': { color: '#7d8591', Icon: 'ribbon' },
  'ribbon:season-gold': { color: '#a3803c', Icon: 'ribbon' },
  'laurel:cup-winner': { color: '#4e5e45', Icon: 'laurel' },
  'badge:founding': { color: '#6e2333', Icon: 'star' },
  'badge:ritual-uncharted': { color: houseTokens.lantern.ink, Icon: 'ritual' },
  'badge:ritual-debate': { color: houseTokens.quill.ink, Icon: 'ritual' },
  'badge:ritual-heartbreak': { color: houseTokens.thorn.ink, Icon: 'ritual' },
  'badge:ritual-marathon': { color: houseTokens.hourglass.ink, Icon: 'ritual' },
};

/** Earned marks (ribbons, laurels, founding, ritual badges) as small labelled seals. */
export function ReaderMarks({ keys, size = 22 }: { keys: string[]; size?: number }) {
  const known = keys.filter((k) => MARKS[k]);
  if (!known.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {known.map((k) => {
        const m = MARKS[k];
        const Icon = m.Icon === 'ribbon' ? MedalIcon : m.Icon === 'laurel' ? CrownSimpleIcon : m.Icon === 'star' ? StarFourIcon : SealCheckIcon;
        return (
          <View key={k} accessibilityRole="image" accessibilityLabel={markLabel(k)} style={{ width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, borderWidth: 1.5, borderColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={size * 0.62} weight="fill" color={m.color} />
          </View>
        );
      })}
    </View>
  );
}
export const markLabel = (k: string) => t(`marks.${k.replace(':', '-')}`);
