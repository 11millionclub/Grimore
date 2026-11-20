import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompassIcon, GameControllerIcon, HouseIcon, PlusIcon, UserCircleIcon, type IconProps } from '@/components/icons';
import { Glass, Press, Text } from '@/components/ui';
import { fonts, layout, radius, spacing, useTheme } from '@/theme';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'Home', Icon: HouseIcon },
  explore: { label: 'Explore', Icon: CompassIcon },
  add: { label: 'Add', Icon: PlusIcon },
  play: { label: 'Play', Icon: GameControllerIcon },
  me: { label: 'Me', Icon: UserCircleIcon },
};

/** Floating glass pill. The centre button is an action (log a book), not a page. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 6, alignItems: 'center' }}>
      <View
        accessibilityRole="tablist"
        style={{
          width: '100%',
          maxWidth: 520,
          height: layout.tabBarHeight,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 25,
          shadowOffset: { width: 0, height: 18 },
          elevation: 12,
        }}
      >
        <Glass style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm }}>
          {state.routes.map((route, index) => {
            const meta = TABS[route.name];
            if (!meta) return null;
            const focused = state.index === index;
            const tap = () => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              if (route.name === 'add') return router.push('/add');
              if (!focused) navigateToTab(route.key);
            };
            if (route.name === 'add')
              return (
                <Press
                  key={route.key}
                  onPress={tap}
                  accessibilityRole="button"
                  accessibilityLabel="Log a book"
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <PlusIcon size={22} weight="bold" color={colors.onAccent} />
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
                style={{ width: 62, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: focused ? colors.surface3 + 'b3' : 'transparent' }}
              >
                <Icon size={22} weight={focused ? 'fill' : 'regular'} color={focused ? colors.ink : colors.muted} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 10, lineHeight: 12 }} tone={focused ? 'ink' : 'muted'}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </Glass>
      </View>
    </View>
  );
}
