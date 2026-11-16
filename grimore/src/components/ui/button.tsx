import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, typeScale, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'olive' | 'destructive' | 'onDark';
type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, { height: number; paddingHorizontal: number; icon: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, icon: 15 },
  md: { height: 48, paddingHorizontal: spacing.lg, icon: 17 },
  lg: { height: 56, paddingHorizontal: spacing.xl, icon: 18 },
};

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'leading',
  loading,
  disabled,
  fullWidth,
  haptic = true,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, pressed: colors.accentPressed, fg: colors.onAccent, border: 'transparent' },
    olive: { bg: colors.olive, pressed: colors.olive, fg: colors.onOlive, border: 'transparent' },
    secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.ink, border: colors.borderStrong },
    ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.ink, border: 'transparent' },
    destructive: { bg: colors.dangerSoft, pressed: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
    /** Over imagery and dark scenes: parchment text, gilt hairline. */
    onDark: { bg: 'rgba(246,238,221,0.06)', pressed: 'rgba(246,238,221,0.16)', fg: '#F6EEDD', border: 'rgba(217,182,110,0.7)' },
  }[variant];
  const s = sizes[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: radius.full,
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderWidth: variant === 'secondary' || variant === 'onDark' ? 1 : 0,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: iconPosition === 'leading' ? 'row' : 'row-reverse', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <Icon name={icon} size={s.icon} color={palette.fg} /> : null}
          <Text style={[typeScale.button, { color: palette.fg, fontSize: size === 'sm' ? 13.5 : 15 }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'ink',
  filled,
  size = 40,
  disabled,
  color: colorOverride,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'ink' | 'accent' | 'muted';
  filled?: boolean;
  size?: number;
  disabled?: boolean;
  /** For buttons floating over imagery. */
  color?: string;
}) {
  const { colors } = useTheme();
  const color = colorOverride ?? (tone === 'accent' ? colors.accent : tone === 'muted' ? colors.inkMuted : colors.ink);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? (colorOverride ? 'rgba(255,255,255,0.15)' : colors.surfaceMuted) : filled ? colors.surface : 'transparent',
        borderWidth: filled ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={color} />
    </Pressable>
  );
}
