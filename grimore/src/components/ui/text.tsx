import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typeScale, useTheme, type Palette, type TypeVariant } from '@/theme';

export type TextTone = 'ink' | 'muted' | 'faint' | 'accent' | 'good' | 'danger' | 'onAccent' | 'bg';

const toneKey: Record<TextTone, keyof Palette> = {
  ink: 'ink',
  muted: 'muted',
  faint: 'faint',
  accent: 'accent',
  good: 'good',
  danger: 'danger',
  onAccent: 'onAccent',
  bg: 'bg',
};

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  color?: string;
};

export function Text({ variant = 'body', tone = 'ink', align, color, style, ...props }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.5}
      {...props}
      style={[typeScale[variant], { color: color ?? colors[toneKey[tone]] }, align && { textAlign: align }, style]}
    />
  );
}
