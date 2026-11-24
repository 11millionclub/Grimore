import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { StarIcon } from '@/components/icons';
import { fonts, radius, useTheme } from '@/theme';
import { MAX_STARS, STAR_STEPS } from '@/utils/ratings';

import { Text } from './text';

/** Book cover. A 4px radius: covers are physical objects. Falls back to a typeset jacket. */
export function Cover({
  uri,
  title,
  author,
  width,
  style,
  shadow = true,
}: {
  uri?: string | null;
  title: string;
  author?: string | null;
  width: number;
  style?: StyleProp<ViewStyle>;
  shadow?: boolean;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * 1.5);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Cover of ${title}`}
      style={[
        { width, height, borderRadius: radius.cover, backgroundColor: colors.surface2, overflow: 'hidden' },
        shadow && { shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
        style,
      ]}
    >
      {uri && !failed ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} onError={() => setFailed(true)} recyclingKey={uri} />
      ) : (
        <View style={{ flex: 1, padding: Math.max(5, width * 0.08), justifyContent: 'space-between', backgroundColor: colors.surface3 }}>
          <Text numberOfLines={4} style={{ fontFamily: fonts.serifBold, fontSize: Math.max(9, Math.min(15, width / 6)), lineHeight: Math.max(11, Math.min(17, width / 5.2)) }}>
            {title}
          </Text>
          {author ? (
            <Text numberOfLines={2} tone="muted" style={{ fontFamily: fonts.regular, fontSize: Math.max(7, Math.min(10, width / 9)) }}>
              {author}
            </Text>
          ) : null}
        </View>
      )}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: 'rgba(0,0,0,0.12)' }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: radius.cover, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
    </View>
  );
}

export function Avatar({ uri, name, size = 36, ring }: { uri?: string | null; name?: string | null; size?: number; ring?: boolean }) {
  const { colors } = useTheme();
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={200} />
      ) : (
        <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.38 }} tone="muted">
          {initials || '?'}
        </Text>
      )}
    </View>
  );
  if (!ring) return inner;
  return (
    <View style={{ padding: 2, borderRadius: size, borderWidth: 2, borderColor: colors.accent }}>
      <View style={{ padding: 1, borderRadius: size, backgroundColor: colors.bg }}>{inner}</View>
    </View>
  );
}

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={`${value} out of ${MAX_STARS} stars`} style={{ flexDirection: 'row', gap: 2 }}>
      {STAR_STEPS.map((i) => (
        <StarIcon key={i} size={size} weight="fill" color={i <= Math.round(value) ? colors.gold : colors.surface3} />
      ))}
    </View>
  );
}
