import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { fonts, motion, radius, useTheme } from '@/theme';

import { Text } from './text';

/** Pill segmented control with a sliding thumb. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(index * segment);
  const w = useSharedValue(segment);
  useEffect(() => {
    w.value = segment;
    x.value = withSpring(index * segment, motion.spring);
  }, [index, segment, x, w]);
  const thumb = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.full, padding: 4 }}
    >
      {segment > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              borderRadius: radius.full,
              backgroundColor: colors.surface,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            },
            thumb,
          ]}
        />
      )}
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={{ flex: 1, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 13 }} tone={o.value === value ? 'ink' : 'muted'}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
