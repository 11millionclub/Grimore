import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { Text } from './text';

/**
 * Five-star rating with half steps. Interactive when `onChange` is set:
 * tap the left half of a star for .5, the right half for a whole value.
 * Tapping the current value clears it.
 */
export function Rating({
  value,
  onChange,
  size = 18,
  showValue,
}: {
  value: number | null | undefined;
  onChange?: (value: number | null) => void;
  size?: number;
  showValue?: boolean;
}) {
  const { colors } = useTheme();
  const v = value ?? 0;
  const set = (next: number) => {
    if (!onChange) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onChange(next === v ? null : next);
  };

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
      accessible
      accessibilityLabel={v ? `Rated ${v} out of 5` : 'Not rated'}
      accessibilityRole={onChange ? 'adjustable' : undefined}
      accessibilityValue={onChange ? { min: 0, max: 5, now: v } : undefined}
      accessibilityActions={onChange ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') set(Math.min(5, v + 0.5));
        if (e.nativeEvent.actionName === 'decrement') set(Math.max(0.5, v - 0.5));
      }}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const name = v >= i ? 'star' : v >= i - 0.5 ? 'star-half-full' : 'star-outline';
        return (
          <View key={i} style={{ width: size, height: size }}>
            <MaterialCommunityIcons name={name} size={size} color={v >= i - 0.5 ? colors.accent : colors.borderStrong} />
            {onChange ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
                <Pressable style={{ flex: 1 }} hitSlop={{ top: 10, bottom: 10 }} onPress={() => set(i - 0.5)} />
                <Pressable style={{ flex: 1 }} hitSlop={{ top: 10, bottom: 10 }} onPress={() => set(i)} />
              </View>
            ) : null}
          </View>
        );
      })}
      {showValue && v ? (
        <Text variant="caption" style={{ marginLeft: spacing.xs }}>
          {v.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}
