import { forwardRef, type ElementRef, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

export const TextField = forwardRef<ElementRef<typeof TextInput>, TextInputProps & { label?: string; helper?: string; error?: string; prefix?: string; left?: ReactNode; right?: ReactNode }>(
  function TextField({ label, helper, error, prefix, left, right, multiline, style, ...props }, ref) {
    const { colors } = useTheme();
    return (
      <View style={{ gap: 6 }}>
        {label ? (
          <Text variant="small" tone="muted">
            {label}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            minHeight: multiline ? 96 : 48,
            borderRadius: radius.tile,
            backgroundColor: colors.surface2,
            paddingHorizontal: spacing.base,
            gap: spacing.sm,
            borderWidth: error ? 1 : 0,
            borderColor: colors.danger,
          }}
        >
          {left}
          {prefix ? <Text tone="muted">{prefix}</Text> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.faint}
            selectionColor={colors.accent}
            multiline={multiline}
            accessibilityLabel={label ?? props.placeholder}
            {...props}
            style={[{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 16, paddingVertical: multiline ? 12 : 0, minHeight: multiline ? 96 : 48, textAlignVertical: multiline ? 'top' : 'center' }, style]}
          />
          {right}
        </View>
        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : helper ? (
          <Text variant="caption" tone="muted">
            {helper}
          </Text>
        ) : null}
      </View>
    );
  },
);
