import { View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export type AchievementView = { id: string; name: string; description: string; icon: string; earned_at: string | null };

/** Earned achievements are struck like a seal; locked ones stay as quiet outlines. */
export function AchievementGrid({ items, showLocked = true }: { items: AchievementView[]; showLocked?: boolean }) {
  const { colors } = useTheme();
  const list = showLocked ? items : items.filter((a) => a.earned_at);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {list.map((a) => {
        const earned = !!a.earned_at;
        return (
          <View
            key={a.id}
            accessible
            accessibilityLabel={`${a.name}. ${a.description}. ${earned ? 'Earned' : 'Locked'}`}
            style={{ width: '30%', flexGrow: 1, maxWidth: 160, alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: earned ? colors.surface : 'transparent', borderWidth: 1, borderColor: earned ? colors.border : colors.border, borderStyle: earned ? 'solid' : 'dashed' }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: earned ? colors.accent : 'transparent',
                borderWidth: earned ? 0 : 1,
                borderColor: colors.borderStrong,
              }}
            >
              <Icon name={(earned ? a.icon : 'lock') as IconName} size={20} color={earned ? colors.onAccent : colors.inkSubtle} />
            </View>
            <Text variant="bodyStrong" align="center" style={{ fontSize: 13 }} tone={earned ? 'ink' : 'muted'}>
              {a.name}
            </Text>
            <Text variant="caption" align="center" style={{ fontSize: 11 }}>
              {a.description}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
