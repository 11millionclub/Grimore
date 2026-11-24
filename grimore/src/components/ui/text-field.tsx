import { forwardRef, useState, type ElementRef, type ReactNode } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

export const TextField = forwardRef<ElementRef<typeof TextInput>, TextInputProps & { label?: string; helper?: string; error?: string; prefix?: string; left?: ReactNode; right?: ReactNode }>(
  function TextField({ label, helper, error, prefix, left, right, multiline, style, onFocus, onBlur, ...props }, ref) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
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
            borderWidth: 1,
            borderColor: error ? colors.danger : focused ? colors.lineStrong : 'transparent',
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
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
            // minWidth 0 lets the input shrink inside narrow rows (browsers give inputs an intrinsic width).
            style={[{ flex: 1, minWidth: 0, width: '100%', color: colors.ink, fontFamily: fonts.regular, fontSize: 16, paddingVertical: multiline ? 12 : 0, minHeight: multiline ? 96 : 48, textAlignVertical: multiline ? 'top' : 'center' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null, style]}
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
