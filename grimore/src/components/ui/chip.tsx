import { Pressable, ScrollView, View } from 'react-native';

import { layout, radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  count,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        height: 34,
        paddingHorizontal: spacing.md + 2,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? colors.ink : colors.border,
        backgroundColor: selected ? colors.ink : pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? colors.canvas : colors.inkMuted} /> : null}
      <Text variant="callout" style={{ color: selected ? colors.canvas : colors.ink, fontSize: 13.5 }}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text variant="caption" style={{ color: selected ? colors.canvas : colors.inkSubtle }}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Horizontally scrolling filter row that bleeds to the screen edges. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -layout.screenPadding, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: layout.screenPadding, gap: spacing.sm }}
    >
      {children}
    </ScrollView>
  );
}

/** Wrapping chip group for multi-select (onboarding, filters). */
export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}
