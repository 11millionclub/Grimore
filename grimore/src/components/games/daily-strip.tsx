import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, Skeleton, Text } from '@/components/ui';
import { GAME_META, type Challenge, type GameType } from '@/features/games/types';
import { radius, spacing, useTheme } from '@/theme';

const ORDER: GameType[] = ['bookle', 'cover_reveal', 'quiz'];

function statusOf(c: Challenge | undefined): 'unavailable' | 'new' | 'in_progress' | 'won' | 'lost' {
  if (!c) return 'unavailable';
  if (!c.attempt) return 'new';
  return c.attempt.status;
}

/** Three compact tiles, one per daily game, with today's status at a glance. */
export function DailyStrip({ challenges, loading, compact }: { challenges: Challenge[] | undefined; loading?: boolean; compact?: boolean }) {
  const { colors } = useTheme();
  if (compact) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {ORDER.map((game) => {
          const c = challenges?.find((x) => x.game === game);
          const status = statusOf(c);
          const done = status === 'won' || status === 'lost';
          return (
            <View key={game} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: status === 'won' ? colors.oliveSoft : colors.surfaceMuted }}>
              <Icon name={status === 'won' ? 'check' : done ? 'minus' : GAME_META[game].icon} size={12} tone={status === 'won' ? 'olive' : done ? 'inkMuted' : 'accent'} />
              <Text variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
                {GAME_META[game].name.replace('Literary ', '')}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {ORDER.map((g) => (
          <Skeleton key={g} height={112} rounded={radius.lg} style={{ flex: 1 }} />
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {ORDER.map((game) => {
        const c = challenges?.find((x) => x.game === game);
        const status = statusOf(c);
        const meta = GAME_META[game];
        const done = status === 'won' || status === 'lost';
        const label =
          status === 'won' ? 'Solved' : status === 'lost' ? 'Played' : status === 'in_progress' ? 'Continue' : status === 'unavailable' ? 'Soon' : `+${meta.xp} XP`;
        return (
          <Pressable
            key={game}
            disabled={status === 'unavailable'}
            accessibilityRole="button"
            accessibilityLabel={`${meta.name}. ${done ? (status === 'won' ? 'Solved today' : 'Played today') : 'Not played yet'}`}
            onPress={() => router.push(meta.route as Href)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 112,
              padding: spacing.md,
              borderRadius: radius.lg,
              justifyContent: 'space-between',
              backgroundColor: done ? colors.surfaceMuted : colors.surface,
              borderWidth: 1,
              borderColor: done ? colors.surfaceMuted : colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: status === 'won' ? colors.olive : done ? colors.borderStrong : colors.accentSoft,
              }}
            >
              <Icon name={status === 'won' ? 'check' : meta.icon} size={16} color={status === 'won' ? colors.onOlive : done ? colors.inkMuted : colors.accent} />
            </View>
            <View style={{ gap: 2 }}>
              <Text variant="bodyStrong" style={{ fontSize: 14, lineHeight: 18 }} numberOfLines={2}>
                {meta.name}
              </Text>
              <Text variant="caption" tone={status === 'won' ? 'olive' : status === 'new' || status === 'in_progress' ? 'accent' : 'muted'}>
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
