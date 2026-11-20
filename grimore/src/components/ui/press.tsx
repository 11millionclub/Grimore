import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from '@/theme';

/** Pressable with instant press feedback (scale 0.97), like the prototype's `.press`. */
export function Press({ style, children, hitSlop, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      hitSlop={hitSlop ?? layout.hitSlop}
      {...props}
      style={({ pressed }) => [style, pressed && !props.disabled && { transform: [{ scale: 0.97 }], opacity: 0.92 }, props.disabled && { opacity: 0.4 }]}
    >
      {children}
    </Pressable>
  );
}
