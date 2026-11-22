import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { CastleTurretIcon, CompassRoseIcon, DiceFiveIcon, FeatherIcon, ShieldChevronIcon, type IconProps } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import { fonts, layout, spacing, useTheme } from '@/theme';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'Home', Icon: CastleTurretIcon },
  explore: { label: 'Explore', Icon: CompassRoseIcon },
  log: { label: 'Inscribe', Icon: FeatherIcon },
  play: { label: 'Play', Icon: DiceFiveIcon },
  me: { label: 'Me', Icon: ShieldChevronIcon },
};

const SEAL = 56;

const R = SEAL / 2;

/** A clean wax-seal disc: wine red, a gilt ring, a soft drop shadow. */
function WaxSeal({ color, rim }: { color: string; rim: string }) {
  return (
    <Svg width={SEAL} height={SEAL + 4} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Circle cx={R} cy={R + 2.5} r={R - 2} fill="#3a0d16" opacity={0.25} />
      <Circle cx={R} cy={R} r={R - 2} fill={color} />
      <Circle cx={R} cy={R} r={R - 6} fill="none" stroke={rim} strokeWidth={1.2} />
    </Svg>
  );
}

/** Parchment strip with a gilt rule. The wax seal in the centre (Inscribe) adds a book; it is an action, not a page. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <View
        accessibilityRole="tablist"
        style={{
          backgroundColor: colors.surface,
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
                  accessibilityLabel="Inscribe: add a book"
                  hitSlop={8}
                  style={{ width: 72, alignItems: 'center', marginTop: -24, gap: 3 }}
                >
                  <View style={{ width: SEAL, height: SEAL, alignItems: 'center', justifyContent: 'center' }}>
                    <WaxSeal color={colors.accent} rim={colors.gold} />
                    <View style={{ zIndex: 1 }}>
                      <FeatherIcon size={24} weight="fill" color={colors.onAccent} />
                    </View>
                  </View>
                  <Text style={{ fontFamily: fonts.displayMedium, fontSize: 9.5, lineHeight: 12, letterSpacing: 0.8 }} color={colors.accent}>
                    INSCRIBE
                  </Text>
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
