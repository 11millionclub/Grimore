import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { layout, spacing, useTheme } from '@/theme';

/**
 * Minimal header for pushed screens and modals. Title is optional; most
 * editorial screens let their own serif heading carry the page.
 */
export function TopBar({
  title,
  right,
  mode = 'back',
  transparent,
}: {
  title?: string;
  right?: ReactNode;
  mode?: 'back' | 'close';
  transparent?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isModal = mode === 'close';
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View
      style={{
        paddingTop: isModal ? spacing.md : insets.top + spacing.xs,
        paddingHorizontal: layout.screenPadding - spacing.sm,
        paddingBottom: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: transparent ? 'transparent' : colors.canvas,
        zIndex: 10,
      }}
    >
      <IconButton icon={isModal ? 'x' : 'arrow-left'} label={isModal ? 'Close' : 'Back'} onPress={goBack} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={{ minWidth: 40, flexDirection: 'row', justifyContent: 'flex-end' }}>{right}</View>
    </View>
  );
}
