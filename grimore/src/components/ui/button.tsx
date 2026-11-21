import type { ReactNode } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';

import { Press } from './press';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const heights: Record<Size, number> = { sm: 32, md: 44, lg: 56 };
const pads: Record<Size, number> = { sm: 14, md: 20, lg: 24 };
const fontSizes: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

export function Btn({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  full,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.accent, secondary: colors.surface2, ghost: 'transparent', inverse: colors.ink }[variant];
  const fg = { primary: colors.onAccent, secondary: colors.ink, ghost: colors.ink, inverse: colors.bg }[variant];
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          height: heights[size],
          paddingHorizontal: pads[size],
          borderRadius: radius.sm,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.lineStrong },
        variant === 'primary' && { borderWidth: 1, borderColor: colors.gold },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      {typeof children === 'string' ? (
        <Text numberOfLines={1} color={fg} style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes[size] - 1, lineHeight: fontSizes[size] + 4, letterSpacing: 0.5 }}>
          {children}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{children}</View>
      )}
    </Press>
  );
}

export function IconBtn({
  children,
  onPress,
  label,
  glass,
  filled,
  size = 40,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  label: string;
  glass?: boolean;
  filled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
        glass && { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassEdge },
        filled && { backgroundColor: colors.surface2 },
        style,
      ]}
    >
      {children}
    </Press>
  );
}

export function Chip({ children, active, onPress, icon }: { children: ReactNode; active?: boolean; onPress?: () => void; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={{
        height: 32,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        backgroundColor: active ? colors.ink : colors.surface2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon}
      <Text variant="small" color={active ? colors.bg : colors.ink}>
        {children}
      </Text>
    </Press>
  );
}
