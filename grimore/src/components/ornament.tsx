import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { Text } from '@/components/ui';
import { fonts, GILT } from '@/theme';

/** A gilt rule with a lozenge in the middle and small scrolls either side. */
export function GiltDivider({ width = 240, color = GILT.gold, style }: { width?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const c = width / 2;
  return (
    <View style={[{ alignItems: 'center' }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={16}>
        <Path d={`M 4 8 L ${c - 22} 8 M ${c + 22} 8 L ${width - 4} 8`} stroke={color} strokeWidth={1} opacity={0.8} />
        <Path d={`M ${c - 22} 8 q 6 -6 10 0 q -4 5 -8 1`} stroke={color} strokeWidth={1} fill="none" />
        <Path d={`M ${c + 22} 8 q -6 -6 -10 0 q 4 5 8 1`} stroke={color} strokeWidth={1} fill="none" />
        <Polygon points={`${c},2 ${c + 6},8 ${c},14 ${c - 6},8`} fill={color} />
      </Svg>
    </View>
  );
}

/**
 * A dark plaque with a double gold border and pointed ends, like the name
 * plates on the library paintings.
 */
export function Cartouche({ children, size = 'md', style }: { children: ReactNode; size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle> }) {
  const h = size === 'lg' ? 56 : size === 'md' ? 40 : 30;
  return (
    <View style={[{ height: h, flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }, style]}>
      <Diamond size={h * 0.28} />
      <View style={{ height: h, paddingHorizontal: h * 0.55, justifyContent: 'center', borderRadius: h / 2, backgroundColor: 'rgba(28,19,13,0.92)', borderWidth: 1.5, borderColor: GILT.gold, marginHorizontal: -h * 0.08 }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: h / 2, borderWidth: 0.75, borderColor: GILT.champagne, opacity: 0.45 }} />
        {children}
      </View>
      <Diamond size={h * 0.28} />
    </View>
  );
}

function Diamond({ size }: { size: number }) {
  return <View style={{ width: size, height: size, transform: [{ rotate: '45deg' }], backgroundColor: GILT.gold, borderWidth: 1, borderColor: GILT.champagne, zIndex: 1 }} />;
}

/** Cartouche text in the display serif. */
export function CartoucheText({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <Text numberOfLines={1} style={{ fontFamily: fonts.serifBold, fontSize: size, lineHeight: size * 1.2, letterSpacing: 0.6, color: GILT.ivory }}>
      {children}
    </Text>
  );
}

/**
 * Profile tabs as a carved walnut rail: the open tab sits on a gold plate
 * with a lozenge under it.
 */
export function GildedTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const [w, setW] = useState(0);
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(198,154,67,0.55)', backgroundColor: 'rgba(37,23,15,0.85)', paddingVertical: 4 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Text numberOfLines={1} style={{ fontFamily: on ? fonts.serifBold : fonts.serif, fontSize: !w || w < 460 ? 16 : 19, color: on ? GILT.champagne : 'rgba(242,233,216,0.6)' }}>
              {o.label}
            </Text>
            {on ? <View style={{ position: 'absolute', bottom: -8, width: 9, height: 9, transform: [{ rotate: '45deg' }], backgroundColor: GILT.gold, borderWidth: 1, borderColor: GILT.champagne }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
