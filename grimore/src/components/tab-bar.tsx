import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph, type GlyphName } from '@/components/ornaments';
import { Text } from '@/components/ui';
import { fonts, layout, radius, spacing, useTheme } from '@/theme';

const TABS: Record<string, { label: string; glyph: GlyphName }> = {
  index: { label: 'Hall', glyph: 'dungeon' },
  library: { label: 'Library', glyph: 'book' },
  add: { label: 'Add a book', glyph: 'feather-alt' },
  social: { label: 'Readers', glyph: 'users' },
  profile: { label: 'Nook', glyph: 'chess-rook' },
};

/**
 * Parchment tab bar with a gilt rule. The centre is a raised wax seal that
 * opens "Add a book": building the library is the app's core gesture.
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
          paddingHorizontal: spacing.xs,
          backgroundColor: colors.surface,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.gold,
          boxShadow: shadow.raised,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const isAdd = route.name === 'add';
          const onPress = () => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            if (isAdd) return router.push('/add-book');
            if (!focused) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole={isAdd ? 'button' : 'tab'}
              accessibilityState={isAdd ? undefined : { selected: focused }}
              accessibilityLabel={meta.label}
              onPress={onPress}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              {isAdd ? (
                <View
                  style={{
                    width: 58,
                    height: 58,
                    marginTop: -26,
                    borderRadius: 29,
                    backgroundColor: colors.accent,
                    borderWidth: 3,
                    borderColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 6px 14px ${colors.shadow}`,
                  }}
                >
                  <View style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 26, borderWidth: 1, borderColor: colors.gold, borderStyle: 'dashed' }} />
                  <Glyph name="feather-alt" size={20} color={colors.onAccent} />
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Glyph name={meta.glyph} size={17} color={focused ? colors.accent : colors.inkSubtle} />
                  <Text style={{ fontFamily: focused ? fonts.displayBold : fonts.inscription, fontSize: 9, letterSpacing: 1.2, color: focused ? colors.ink : colors.inkSubtle }}>
                    {meta.label.toUpperCase()}
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
