import { Image } from 'expo-image';
import { View } from 'react-native';

import { coverTones, fonts, useTheme } from '@/theme';
import { hashString } from '@/utils/hash';

import { Text } from './text';

export function Avatar({
  name,
  uri,
  size = 40,
  ring,
  square,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  ring?: boolean;
  /** Fill a shaped frame (arch, shield) instead of drawing a circle. */
  square?: boolean;
}) {
  const { colors } = useTheme();
  const tone = coverTones[hashString(name) % coverTones.length];
  const initials = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name}'s profile picture`}
      style={{
        width: size,
        height: size,
        borderRadius: square ? 0 : size / 2,
        overflow: 'hidden',
        backgroundColor: tone.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2 : 0,
        borderColor: colors.canvas,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
      ) : (
        <Text style={{ color: tone.ink, fontFamily: fonts.serifSemibold, fontSize: size * 0.4, lineHeight: size * 0.5 }}>
          {initials || '·'}
        </Text>
      )}
    </View>
  );
}
