import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const SEAL = 52;

/**
 * Floating bar. The ember seal in the middle (Inscribe) adds a book: it is an
 * action, not a page, so it opens a sheet instead of switching tabs.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.md }}>
      <View
        accessibilityRole="tablist"
        style={{
          height: layout.tabBarHeight,
          maxWidth: 520,
          width: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: spacing.xs,
          backgroundColor: colors.glass,
          borderRadius: layout.tabBarHeight / 2,
          borderWidth: 1,
          borderColor: colors.glassEdge,
          shadowColor: colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 8 },
          elevation: 14,
        }}
      >
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
              <Press key={route.key} onPress={tap} accessibilityRole="button" accessibilityLabel="Inscribe: add a book" hitSlop={8} style={{ width: 64, alignItems: 'center' }}>
                <View
                  style={{
                    width: SEAL,
                    height: SEAL,
                    borderRadius: SEAL / 2,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.accent,
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <View style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: SEAL / 2, borderWidth: 1, borderColor: colors.onAccent, opacity: 0.35 }} />
                  <FeatherIcon size={23} weight="fill" color={colors.onAccent} />
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
              style={{ width: 60, height: layout.tabBarHeight - 8, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <Icon size={23} weight={focused ? 'fill' : 'regular'} color={focused ? colors.ink : colors.faint} />
              <Text style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 10.5, lineHeight: 13 }} color={focused ? colors.ink : colors.faint}>
                {meta.label}
              </Text>
              <View style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: focused ? colors.accent : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
