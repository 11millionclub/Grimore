import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { CheckCircleIcon } from '@/components/icons';
import { radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

type ToastState = { message: string | null; key: number; show: (m: string) => void; hide: () => void };

const useToastStore = create<ToastState>((set) => ({
  message: null,
  key: 0,
  show: (message) => set((s) => ({ message, key: s.key + 1 })),
  hide: () => set({ message: null }),
}));

/** Brief confirmation at the top of the screen. */
export const toast = (message: string) => useToastStore.getState().show(message);

export function ToastHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { message, key, hide } = useToastStore();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2400);
    return () => clearTimeout(t);
  }, [message, key, hide]);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
      <Animated.View
        key={key}
        entering={FadeInUp.springify().damping(18)}
        exiting={FadeOutUp}
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.ink,
          paddingHorizontal: spacing.base,
          paddingVertical: 10,
          borderRadius: radius.full,
          maxWidth: '90%',
        }}
      >
        <CheckCircleIcon size={18} weight="fill" color={colors.bg} />
        <Text variant="small" color={colors.bg} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
