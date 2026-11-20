import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** Translucent bar background: real blur on iOS, a tinted glass colour elsewhere. */
export function Glass({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, scheme } = useTheme();
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={60} tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={[{ overflow: 'hidden' }, style]}>
        {children}
      </BlurView>
    );
  }
  return <View style={[{ backgroundColor: colors.glass }, style]}>{children}</View>;
}
