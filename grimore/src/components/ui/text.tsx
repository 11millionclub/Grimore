import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typeScale, useTheme, type Palette, type TypeVariant } from '@/theme';

export type TextTone = 'ink' | 'muted' | 'subtle' | 'accent' | 'olive' | 'danger' | 'onAccent' | 'ochre';

const toneToColor: Record<TextTone, keyof Palette> = {
  ink: 'ink',
  muted: 'inkMuted',
  subtle: 'inkSubtle',
  accent: 'accent',
  olive: 'olive',
  danger: 'danger',
  onAccent: 'onAccent',
  ochre: 'ochre',
};

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', tone, align, style, ...props }: TextProps) {
  const { colors } = useTheme();
  const defaultTone: TextTone = variant === 'caption' || variant === 'eyebrow' ? 'muted' : 'ink';
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...props}
      style={[typeScale[variant], { color: colors[toneToColor[tone ?? defaultTone]] }, align && { textAlign: align }, style]}
    />
  );
}
