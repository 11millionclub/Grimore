import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { radius, spacing, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/** Editorial section heading: small caps eyebrow, serif title, optional link. */
export function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text variant="callout" tone="accent">
            {actionLabel}
          </Text>
          <Icon name="chevron-right" size={16} tone="accent" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Page masthead used at the top of each tab. */
export function Masthead({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.xl }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
        <Text variant="title1" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: spacing.xs }}>{right}</View> : null}
    </View>
  );
}

export function Divider({ inset = 0, spacingY = 0 }: { inset?: number; spacingY?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: inset, marginVertical: spacingY }} />;
}

/** A quiet surface. Use for grouped content, not for every element. */
export function Surface({
  children,
  style,
  padded = true,
  muted,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: muted ? colors.surfaceMuted : colors.surface,
          borderRadius: radius.lg,
          borderWidth: muted ? 0 : 1,
          borderColor: colors.border,
          padding: padded ? spacing.base : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Stat({ value, label, align = 'left' }: { value: string | number; label: string; align?: 'left' | 'center' }) {
  return (
    <View style={{ gap: 2, alignItems: align === 'center' ? 'center' : 'flex-start' }} accessible accessibilityLabel={`${value} ${label}`}>
      <Text variant="numeral">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  onPress,
  leading,
  trailing,
  destructive,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md + 2,
        backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
      })}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" tone={destructive ? 'danger' : 'ink'}>
          {title}
        </Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevron-right" size={18} tone="inkSubtle" /> : null)}
    </Pressable>
  );
}
