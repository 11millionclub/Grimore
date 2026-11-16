import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { fonts, spacing, useTheme } from '@/theme';

export type GlyphName = ComponentProps<typeof FontAwesome5>['name'];

/**
 * A heraldic glyph (dragon, tower, scroll, wizard's hat…) from Font Awesome's
 * solid set. Used only as decoration and for fantasy-flavoured moments; the
 * interface itself keeps the plain Feather icons.
 */
export function Glyph({ name, size = 18, color }: { name: GlyphName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <FontAwesome5 name={name} solid size={size} color={color ?? colors.gold} accessibilityElementsHidden importantForAccessibility="no" />;
}

/** Hairline–diamond–hairline divider, optionally crowned with a glyph. */
export function Flourish({ glyph, width = 220, color, style }: { glyph?: GlyphName; width?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const c = color ?? colors.gold;
  const mid = width / 2;
  const gap = glyph ? 18 : 8;
  return (
    <View style={[{ width, height: 18, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={18} style={{ position: 'absolute' }}>
        <Path d={`M0 9 H${mid - gap - 8}`} stroke={c} strokeWidth={0.8} opacity={0.7} />
        <Path d={`M${mid + gap + 8} 9 H${width}`} stroke={c} strokeWidth={0.8} opacity={0.7} />
        {/* small terminal diamonds */}
        <Path d={`M${mid - gap - 8} 9 l4 -3 l4 3 l-4 3 Z`} fill={c} />
        <Path d={`M${mid + gap} 9 l4 -3 l4 3 l-4 3 Z`} fill={c} />
        {!glyph ? <Path d={`M${mid - 5} 9 l5 -5 l5 5 l-5 5 Z`} fill="none" stroke={c} strokeWidth={1} /> : null}
        <Circle cx={4} cy={9} r={1.4} fill={c} />
        <Circle cx={width - 4} cy={9} r={1.4} fill={c} />
      </Svg>
      {glyph ? <Glyph name={glyph} size={13} color={c} /> : null}
    </View>
  );
}

/** The GriMore wordmark: Cinzel capitals between two small flourishes. */
export function Wordmark({ size = 14, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  const c = color ?? colors.ink;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="GriMore" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Svg width={22} height={8}>
        <Path d="M0 4 H14 M14 4 l4 -3 l4 3 l-4 3 Z" stroke={colors.gold} strokeWidth={0.9} fill={colors.gold} />
      </Svg>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: size, letterSpacing: size * 0.32, color: c }}>GRIMORE</Text>
      <Svg width={22} height={8}>
        <Path d="M22 4 H8 M8 4 l-4 -3 l-4 3 l4 3 Z" stroke={colors.gold} strokeWidth={0.9} fill={colors.gold} />
      </Svg>
    </View>
  );
}

/** Dragon (or other glyph) inside a gilt double ring: the house seal. */
export function Emblem({ size = 56, glyph = 'dragon', color, background }: { size?: number; glyph?: GlyphName; color?: string; background?: string }) {
  const { colors } = useTheme();
  const c = color ?? colors.gold;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={background ?? 'transparent'} stroke={c} strokeWidth={1.2} />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 5} fill="none" stroke={c} strokeWidth={0.6} strokeDasharray="1.5 3" />
      </Svg>
      <Glyph name={glyph} size={size * 0.42} color={c} />
    </View>
  );
}

/**
 * Gilt double-rule frame with small corner diamonds, for panels that deserve
 * ceremony (current read, the Nook header card). Use sparingly.
 */
export function OrnateFrame({ children, style, padding = spacing.lg, background }: { children: ReactNode; style?: StyleProp<ViewStyle>; padding?: number; background?: string }) {
  const { colors } = useTheme();
  const corner = (pos: ViewStyle) => (
    <View style={[{ position: 'absolute', width: 9, height: 9, transform: [{ rotate: '45deg' }], backgroundColor: colors.gold }, pos]} />
  );
  return (
    <View style={[{ borderWidth: 1, borderColor: colors.gold, borderRadius: 2, padding: 3, backgroundColor: background ?? colors.surface }, style]}>
      <View style={{ borderWidth: 0.6, borderColor: colors.borderStrong, padding }}>{children}</View>
      {corner({ top: -5, left: -5 })}
      {corner({ top: -5, right: -5 })}
      {corner({ bottom: -5, left: -5 })}
      {corner({ bottom: -5, right: -5 })}
    </View>
  );
}

/** Gothic arch window shape for portraits (avatar inside). */
export function ArchFrame({ children, width = 112, color }: { children: ReactNode; width?: number; color?: string }) {
  const { colors } = useTheme();
  const height = width * 1.28;
  return (
    <View style={{ width: width + 12, height: height + 12, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: width + 12,
          height: height + 12,
          borderTopLeftRadius: (width + 12) / 2,
          borderTopRightRadius: (width + 12) / 2,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          borderWidth: 1.5,
          borderColor: color ?? colors.gold,
        }}
      />
      <View style={{ width, height, borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, overflow: 'hidden', backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/** A wooden shelf plank: books stand on it in the Library and the Nook. */
export function ShelfPlank({ top, edge, style }: { top?: string; edge?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ height: 12, marginHorizontal: -6 }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 7, backgroundColor: top ?? colors.shelf, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      <View style={{ height: 5, backgroundColor: edge ?? colors.shelfEdge, boxShadow: '0 6px 8px rgba(30,18,8,0.25)' }} />
    </View>
  );
}
