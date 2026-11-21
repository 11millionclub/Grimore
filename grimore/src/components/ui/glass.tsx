import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** Bar background: parchment wash over a light blur on iOS, the plain parchment colour elsewhere. */
export function Glass({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, scheme } = useTheme();
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={[{ overflow: 'hidden' }, style]}>
        <View style={{ position: 'absolute', inset: 0, backgroundColor: colors.glass, opacity: 0.85 }} />
        {children}
      </BlurView>
    );
  }
  return <View style={[{ backgroundColor: colors.glass }, style]}>{children}</View>;
}
