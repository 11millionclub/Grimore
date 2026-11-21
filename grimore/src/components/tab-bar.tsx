import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { CastleTurretIcon, CompassRoseIcon, DiceFiveIcon, FeatherIcon, ShieldChevronIcon, type IconProps } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import { fonts, layout, spacing, useTheme } from '@/theme';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'Home', Icon: CastleTurretIcon },
  explore: { label: 'Explore', Icon: CompassRoseIcon },
  log: { label: 'Log', Icon: FeatherIcon },
  play: { label: 'Play', Icon: DiceFiveIcon },
  me: { label: 'Me', Icon: ShieldChevronIcon },
};

const SEAL = 60;

/** Wax seal: a scalloped disc of wine-red wax with a quill pressed into it. */
function sealPath(r: number, cx: number, cy: number) {
  const steps = 96;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // Irregular wax edge: two wobbles of different frequency.
    const rr = r - 2.2 + Math.sin(a * 11) * 1.4 + Math.sin(a * 4 + 1) * 1.1;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
  }
  return d + 'Z';
}
const R = SEAL / 2;
const SEAL_SHADOW = sealPath(R - 1, R, R + 2.5);
const SEAL_BODY = sealPath(R - 1, R, R);

function WaxSeal({ color, rim }: { color: string; rim: string }) {
  return (
    <Svg width={SEAL} height={SEAL + 4} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Path d={SEAL_SHADOW} fill="#3a0d16" opacity={0.35} />
      <Path d={SEAL_BODY} fill={color} />
      <Circle cx={R} cy={R} r={R - 10} fill="none" stroke={rim} strokeWidth={1.2} opacity={0.5} />
    </Svg>
  );
}

/** Parchment strip with a gilt rule. The wax seal in the centre logs a book; it is an action, not a page. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <View
        accessibilityRole="tablist"
        style={{
          backgroundColor: colors.glass,
          borderTopWidth: 1.5,
          borderTopColor: colors.gold,
          paddingBottom: insets.bottom,
          shadowColor: colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}
      >
        <View style={{ height: 3, borderBottomWidth: 0.5, borderBottomColor: colors.gold, opacity: 0.6 }} />
        <View style={{ height: layout.tabBarHeight - 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.sm, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {state.routes.map((route, index) => {
            const meta = TABS[route.name];
            if (!meta) return null;
            const focused = state.index === index;
            const tap = () => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              if (route.name === 'log') return router.push('/add');
              if (!focused) navigateToTab(route.key);
            };
            if (route.name === 'log')
              return (
                <Press
                  key={route.key}
                  onPress={tap}
                  accessibilityRole="button"
                  accessibilityLabel="Log a book"
                  hitSlop={8}
                  style={{
                    width: SEAL,
                    height: SEAL,
                    marginTop: -26,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WaxSeal color={colors.accent} rim={colors.onAccent} />
                  <View style={{ zIndex: 1 }}>
                    <FeatherIcon size={24} weight="fill" color={colors.onAccent} />
                  </View>
                </Press>
              );
            const { Icon } = meta;
            return (
              <Pressable
                key={route.key}
                onPress={tap}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={meta.label}
                style={{ width: 64, height: 50, alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <Icon size={23} weight={focused ? 'fill' : 'regular'} color={focused ? colors.accent : colors.muted} />
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: 9.5, lineHeight: 12, letterSpacing: 0.8 }} color={focused ? colors.accent : colors.muted}>
                  {meta.label.toUpperCase()}
                </Text>
                <View style={{ position: 'absolute', bottom: -1, width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: focused ? colors.gold : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
