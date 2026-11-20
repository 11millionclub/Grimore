import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion, useTheme } from '@/theme';

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { colors } = useTheme();
  const x = useSharedValue(value ? 23 : 3);
  useEffect(() => {
    x.value = withSpring(value ? 23 : 3, motion.spring);
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: value ? colors.accent : colors.surface3, justifyContent: 'center' }}
    >
      <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }, knob]} />
    </Pressable>
  );
}
