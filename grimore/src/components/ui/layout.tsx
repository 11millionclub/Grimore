import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, useTheme } from '@/theme';

import { Btn } from './button';
import { Press } from './press';
import { Text } from './text';

export function Progress({ value, height = 4, style, color }: { value: number; height?: number; style?: StyleProp<ViewStyle>; color?: string }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(1, value || 0));
  const fill = useAnimatedStyle(() => ({ width: `${withSpring(v * 100, { damping: 30, stiffness: 120 })}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[{ height, borderRadius: height, backgroundColor: colors.surface3, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: color ?? colors.accent }, fill]} />
    </View>
  );
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
      <Text variant="h2" accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Press onPress={onAction} accessibilityRole="button">
          <Text variant="small" tone="muted">
            {action}
          </Text>
        </Press>
      ) : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.line }, style]} />;
}

export function Card({ children, style, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }) {
  const { colors } = useTheme();
  const s = [{ backgroundColor: colors.surface, borderRadius: radius.card, padding: padded ? spacing.base : 0 }, style];
  if (onPress)
    return (
      <Press onPress={onPress} style={s}>
        {children}
      </Press>
    );
  return <View style={s}>{children}</View>;
}

/** Staggered entrance; disabled when the system asks for reduced motion. */
export function Stagger({ children, i = 0, style }: { children: ReactNode; i?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View style={style} entering={FadeInDown.duration(400).delay(Math.min(i, 8) * 45).reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}

export function Skeleton({ width = '100%', height = 14, rounded = radius.sm, style }: { width?: DimensionValue; height?: DimensionValue; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    if (!reduced) opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity, reduced]);
  const a = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View accessibilityElementsHidden style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surface2 }, a, style]} />;
}

export function EmptyState({ icon, title, body, action, onAction }: { icon?: ReactNode; title: string; body?: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm }}>
      {icon ? (
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs }}>{icon}</View>
      ) : null}
      <Text variant="title" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="muted" align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <Btn size="md" onPress={onAction} style={{ marginTop: spacing.sm, alignSelf: 'center' }}>
          {action}
        </Btn>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return <EmptyState title="Something went wrong" body={message ?? 'Please check your connection and try again.'} action={onRetry ? 'Try again' : undefined} onAction={onRetry} />;
}

/** Rounded inset row group, like the prototype's settings groups. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.lg }}>
      {title ? (
        <Text variant="small" tone="muted" style={{ marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}>
          {title}
        </Text>
      ) : null}
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  right,
  last,
}: {
  icon?: ReactNode;
  label: string;
  value?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      disabled={!onPress && !right}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.base, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}
    >
      {icon}
      <Text variant="body" tone={danger ? 'danger' : 'ink'} style={{ flex: 1 }}>
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text variant="callout" tone="muted">
          {value}
        </Text>
      ) : (
        value
      )}
      {right}
    </Press>
  );
}
