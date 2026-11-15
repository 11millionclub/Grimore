import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: IconName;
  secureToggle?: boolean;
};

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, error, hint, leadingIcon, secureToggle, secureTextEntry, style, multiline, onFocus, onBlur, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const borderColor = error ? colors.danger : focused ? colors.ink : colors.border;

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? (
        <Text variant="eyebrow" tone={error ? 'danger' : 'muted'}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 120 : 52,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.base,
          gap: spacing.sm,
        }}
      >
        {leadingIcon ? <Icon name={leadingIcon} size={18} tone="inkMuted" /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.inkSubtle}
          selectionColor={colors.accent}
          secureTextEntry={hidden}
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
          style={[
            {
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 16,
              color: colors.ink,
              paddingVertical: multiline ? spacing.md : 0,
              minHeight: multiline ? 120 : 50,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} size={18} tone="inkMuted" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});
