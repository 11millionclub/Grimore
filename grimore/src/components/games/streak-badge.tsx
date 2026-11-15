import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export function StreakBadge({ days, active }: { days: number; active: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${days} day streak${active ? ', extended today' : ''}. Open streak details`}
      onPress={() => router.push('/play/streak')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        height: 36,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: active ? colors.accentSoft : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.accentSoft : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name="zap" size={15} tone={active ? 'accent' : 'inkMuted'} />
      <Text variant="bodyStrong" tone={active ? 'accent' : 'ink'} style={{ fontSize: 14 }}>
        {days}
      </Text>
    </Pressable>
  );
}
