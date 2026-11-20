import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { badgeIcon } from '@/components/corner-view';
import { Progress, Screen, Skeleton, Stagger, Text } from '@/components/ui';
import { useAchievements } from '@/hooks/queries';
import { radius, spacing, useTheme } from '@/theme';

export default function Achievements() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { colors } = useTheme();
  const q = useAchievements(userId);
  const list = q.data ?? [];
  const done = list.filter((a) => a.earned_at).length;
  return (
    <Screen title="Achievements" back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Text variant="callout" tone="muted" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, marginTop: -spacing.sm }}>
        {done} of {list.length} unlocked
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg }}>
        {q.isLoading
          ? [0, 1, 2, 3].map((k) => <Skeleton key={k} width="47.5%" height={150} rounded={radius.card} />)
          : list.map((a, i) => {
              const Icon = badgeIcon(a.icon);
              const earned = !!a.earned_at;
              return (
                <Stagger key={a.id} i={i} style={{ width: '47.5%' }}>
                  <View style={{ height: '100%', backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base, opacity: earned ? 1 : 0.8 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: earned ? colors.accent : colors.surface2 }}>
                      <Icon size={24} weight="fill" color={earned ? colors.onAccent : colors.faint} />
                    </View>
                    <Text variant="bodyStrong" style={{ marginTop: spacing.md }}>
                      {a.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {a.description}
                    </Text>
                    {!earned ? (
                      <View style={{ marginTop: spacing.md }}>
                        <Progress value={a.target ? a.progress / a.target : 0} />
                        {a.target > 1 ? (
                          <Text variant="micro" tone="faint" style={{ marginTop: 4 }}>
                            {a.progress} / {a.target}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </Stagger>
              );
            })}
      </View>
    </Screen>
  );
}
