import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

/** Calm pulsing placeholder. Respects reduced-motion settings. */
export function Skeleton({
  width = '100%',
  height = 14,
  rounded = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    if (!reduced) opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceMuted }, animated, style]}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  compact,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? spacing.xl : spacing.huge, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <Icon name={icon} size={24} tone="accent" />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="muted" align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-off"
      title="Something went quiet"
      body={message ?? 'We could not load this page. Check your connection and try again.'}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      compact
    />
  );
}

export function InlineAlert({ tone = 'danger', children }: { tone?: 'danger' | 'olive' | 'ochre'; children: ReactNode }) {
  const { colors } = useTheme();
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'olive' ? colors.oliveSoft : colors.ochreSoft;
  const fg = tone === 'danger' ? colors.danger : tone === 'olive' ? colors.olive : colors.ochre;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: bg, borderRadius: radius.md, padding: spacing.md }}
    >
      <Icon name={tone === 'olive' ? 'check-circle' : 'alert-circle'} size={16} color={fg} />
      <Text variant="callout" style={{ color: fg, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, tone = 'accent', height = 4 }: { value: number; tone?: 'accent' | 'olive'; height?: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: tone === 'olive' ? colors.olive : colors.accent }} />
    </View>
  );
}
