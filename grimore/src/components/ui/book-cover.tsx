import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { coverTones, fonts, radius, spacing, useTheme } from '@/theme';
import { hashString } from '@/utils/hash';

import { Text } from './text';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const widths: Record<Size, number> = { xs: 40, sm: 64, md: 96, lg: 132, xl: 180 };

export type BookCoverProps = {
  title: string;
  author?: string | null;
  uri?: string | null;
  size?: Size;
  width?: number;
  style?: StyleProp<ViewStyle>;
  /** Pass false when the cover is decorative next to a visible title. */
  accessible?: boolean;
};

/**
 * Book cover with a designed typographic fallback. Missing or broken covers
 * render as a quiet cloth-bound jacket rather than an empty grey box.
 */
export function BookCover({ title, author, uri, size = 'md', width, style, accessible = true }: BookCoverProps) {
  const { colors, scheme } = useTheme();
  const [failed, setFailed] = useState(false);
  const w = width ?? widths[size];
  const h = Math.round(w * 1.5);
  const tone = coverTones[hashString(title) % coverTones.length];
  const showImage = !!uri && !failed;
  const small = w < 80;

  return (
    <View
      accessible={accessible}
      accessibilityRole="image"
      accessibilityLabel={`Cover of ${title}${author ? ` by ${author}` : ''}`}
      style={[
        {
          width: w,
          height: h,
          borderRadius: w < 60 ? radius.xs : radius.sm,
          overflow: 'hidden',
          backgroundColor: showImage ? colors.surfaceMuted : tone.bg,
          borderWidth: scheme === 'light' ? 0.5 : 0,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: w >= 80 ? '0 6px 14px rgba(40, 28, 20, 0.16)' : '0 2px 4px rgba(40, 28, 20, 0.12)',
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={{ flex: 1, padding: small ? spacing.xs : spacing.md, justifyContent: 'space-between' }}>
          <View style={{ height: 1, backgroundColor: tone.ink, opacity: 0.35, marginTop: small ? 2 : spacing.xs }} />
          <Text
            numberOfLines={small ? 3 : 5}
            style={{
              fontFamily: fonts.serifSemibold,
              color: tone.ink,
              fontSize: Math.max(8, Math.round(w / 8.5)),
              lineHeight: Math.max(10, Math.round(w / 7)),
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          {author && !small ? (
            <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, color: tone.ink, opacity: 0.8, fontSize: 9, textAlign: 'center', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {author}
            </Text>
          ) : (
            <View />
          )}
        </View>
      )}
      {/* Spine highlight: a subtle hint of a physical book. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(2, w * 0.035), backgroundColor: 'rgba(255,255,255,0.14)' }}
      />
    </View>
  );
}
