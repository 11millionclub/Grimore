import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaretLeftIcon } from '@/components/icons';
import { layout, spacing, useTheme } from '@/theme';

import { IconBtn } from './button';
import { Glass } from './glass';
import { Flourish } from './layout';
import { Text } from './text';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Scroll container with a translucent navigation bar. The large title scrolls
 * away and the compact title fades into the glass bar (iOS pattern).
 */
export function Screen({
  title,
  large = true,
  back = false,
  actions,
  hero,
  barTransparent = false,
  footer,
  tabs = false,
  refreshing,
  onRefresh,
  children,
  contentStyle,
  scroll = true,
  keyboard = false,
}: {
  title?: string;
  large?: boolean;
  back?: boolean;
  actions?: ReactNode;
  hero?: ReactNode;
  /** Bar starts transparent over a hero image. */
  barTransparent?: boolean;
  /** Fixed bar pinned to the bottom (composer, CTA). */
  footer?: ReactNode;
  /** A tab root: leave room for the floating tab bar. */
  tabs?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  keyboard?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const barHeight = insets.top + layout.navBarHeight;
  const tabSpace = tabs ? layout.tabBarHeight + 24 : 0;
  const bottomPad = insets.bottom + (footer ? 24 : 40) + tabSpace;

  const smallTitle = useAnimatedStyle(() => {
    if (!(large || hero || barTransparent)) return { opacity: 1 };
    const range = hero ? [180, 230] : [30, 60];
    return { opacity: interpolate(y.value, range, [0, 1], Extrapolation.CLAMP) };
  });
  const barBg = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, barTransparent ? [160, 220] : [0, 20], [0, 1], Extrapolation.CLAMP),
  }));

  const body = (
    <>
      {hero ?? <View style={{ height: barHeight }} />}
      {large && title && !hero ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.base, paddingTop: spacing.xs, gap: spacing.sm }}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          <Flourish style={{ maxWidth: 220 }} />
        </View>
      ) : null}
      {children}
    </>
  );

  const content = scroll ? (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingBottom: bottomPad }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.muted} progressViewOffset={barHeight} /> : undefined}
    >
      {body}
    </Animated.ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{body}</View>
  );

  const inner = (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {content}
      {footer ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, paddingBottom: insets.bottom + tabSpace + spacing.sm }}>{footer}</View>
      ) : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: barHeight }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, borderBottomWidth: 1, borderBottomColor: colors.line }, barBg]}>
          <Glass style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ marginTop: insets.top, height: layout.navBarHeight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, gap: 4 }}>
          {back ? (
            <IconBtn label="Back" onPress={goBack} glass={barTransparent}>
              <CaretLeftIcon size={22} weight="bold" color={colors.ink} />
            </IconBtn>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <Animated.View style={[{ flex: 1 }, smallTitle]}>
            <Text variant="h2" numberOfLines={1} align="center" style={{ fontSize: 15 }}>
              {title}
            </Text>
          </Animated.View>
          <View style={{ minWidth: 40, flexDirection: 'row', justifyContent: 'flex-end', gap: 2 }}>{actions}</View>
        </View>
      </View>
    </View>
  );

  if (!keyboard) return inner;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {inner}
    </KeyboardAvoidingView>
  );
}

/** Content wrapper for routes presented as bottom sheets. */
export function Sheet({ children, title, subtitle, scroll = true }: { children: ReactNode; title?: string; subtitle?: string; scroll?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const head = (
    <>
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <View style={{ width: 40, height: 6, borderRadius: 3, backgroundColor: colors.surface3 }} />
      </View>
      {title ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text variant="h1" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
  if (!scroll)
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.base }}>
        {head}
        {children}
      </View>
    );
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        {head}
        {children}
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}
