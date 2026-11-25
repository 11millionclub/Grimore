import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookBookmarkIcon, BooksIcon, CompassIcon, ShieldIcon, FeatherIcon, PuzzlePieceIcon, UserCircleIcon, type IconProps } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import { appTheme, barColors, fonts, layout, spacing, useAppTheme } from '@/theme';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'Home', Icon: BooksIcon },
  explore: { label: 'Explore', Icon: CompassIcon },
  grimore: { label: 'Grimore', Icon: BookBookmarkIcon },
  log: { label: 'Inscribe', Icon: FeatherIcon },
  houses: { label: 'Houses', Icon: ShieldIcon },
  play: { label: 'Play', Icon: PuzzlePieceIcon },
  me: { label: 'Me', Icon: UserCircleIcon },
};

const SEAL = 52;

/**
 * Floating walnut bar with a gilt edge, like the plaque on a bookcase. The
 * gold seal in the middle (Inscribe) adds a book: it is an action, not a
 * page, so it opens a sheet instead of switching tabs.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // The bar takes the colours of the chosen app theme.
  const themeId = useAppTheme((x) => x.id);
  const bar = barColors(appTheme(themeId));
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
          backgroundColor: bar.bg,
          borderRadius: layout.tabBarHeight / 2,
          borderWidth: 1.5,
          borderColor: bar.edge,
          shadowColor: '#000',
          shadowOpacity: 0.35,
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
              <Press key={route.key} onPress={tap} accessibilityRole="button" accessibilityLabel="Inscribe: add a book" hitSlop={8} style={{ width: 58, alignItems: 'center' }}>
                <View
                  style={{
                    width: SEAL,
                    height: SEAL,
                    borderRadius: SEAL / 2,
                    backgroundColor: bar.seal,
                    borderWidth: 2,
                    borderColor: bar.sealEdge,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: bar.sealEdge,
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <View style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: SEAL / 2, borderWidth: 1, borderColor: bar.sealIcon, opacity: 0.55 }} />
                  <FeatherIcon size={23} weight="fill" color={bar.sealIcon} />
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
              style={{ flex: 1, maxWidth: 64, height: layout.tabBarHeight - 8, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <Icon size={23} weight={focused ? 'fill' : 'regular'} color={focused ? bar.active : bar.idle} />
              <Text style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 10, lineHeight: 13 }} numberOfLines={1} color={focused ? bar.active : bar.idle}>
                {meta.label}
              </Text>
              <View style={{ position: 'absolute', bottom: 2, width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: focused ? bar.dot : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
