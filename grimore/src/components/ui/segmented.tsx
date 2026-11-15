import { Pressable, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

/** Underlined editorial tabs, used inside a screen (not navigation). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, padding: 3 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 34,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              boxShadow: active ? `0 1px 3px ${colors.shadow}` : undefined,
              paddingHorizontal: spacing.sm,
            }}
          >
            <Text variant="callout" style={{ fontSize: 13.5, color: active ? colors.ink : colors.inkMuted }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
