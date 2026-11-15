import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/components/ui';
import { fonts, layout, radius, spacing, useTheme } from '@/theme';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  library: { label: 'Library', icon: 'book' },
  play: { label: 'Play', icon: 'target' },
  social: { label: 'Social', icon: 'users' },
  profile: { label: 'Profile', icon: 'user' },
};

/**
 * Floating ivory tab bar. "Play" sits in the centre as a wine-red seal so the
 * daily ritual is always one tap away, without shouting.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.base, alignItems: 'center' }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: layout.tabBarHeight,
          width: '100%',
          maxWidth: 520,
          paddingHorizontal: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: shadow.raised,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const isPlay = route.name === 'play';
          const onPress = () => {
            if (focused) return;
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={onPress}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              {isPlay ? (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: focused ? colors.accent : colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={meta.icon} size={21} color={focused ? colors.onAccent : colors.accent} />
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 3 }}>
                  <Icon name={meta.icon} size={20} color={focused ? colors.ink : colors.inkSubtle} />
                  <Text style={{ fontFamily: focused ? fonts.sansSemibold : fonts.sansMedium, fontSize: 10.5, color: focused ? colors.ink : colors.inkSubtle }}>
                    {meta.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
