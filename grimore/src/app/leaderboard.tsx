import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Board } from '@/components/board';
import { Avatar, Press, Screen, Text } from '@/components/ui';
import { useTodayGames } from '@/hooks/queries';
import { GAMES, getLeaderboard, getWeeklyLeaderboard, mmss, type GameId } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function Leaderboard() {
  const params = useLocalSearchParams<{ game?: GameId }>();
  const { colors } = useTheme();
  const [g, setG] = useState<GameId | 'week'>(params.game ?? 'hangman');
  const today = useTodayGames();
  const challenge = today.data?.find((x) => x.game === g);
  const daily = useQuery({ queryKey: ['board', challenge?.id], queryFn: () => getLeaderboard(challenge!.id), enabled: g !== 'week' && !!challenge });
  const week = useQuery({ queryKey: ['board', 'week'], queryFn: getWeeklyLeaderboard, enabled: g === 'week' });
  const rows = (g === 'week' ? week.data : daily.data) ?? [];
  const podium = [1, 0, 2].filter((i) => rows[i]);
  return (
    <Screen title="Leaderboard" back refreshing={daily.isRefetching || week.isRefetching} onRefresh={() => (g === 'week' ? week.refetch() : daily.refetch())}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm }}>
        {[...GAMES.map((x) => ({ id: x.id as GameId | 'week', name: x.name })), { id: 'week' as const, name: 'This week' }].map((x) => (
          <Press key={x.id} onPress={() => setG(x.id)} style={{ height: 36, paddingHorizontal: 14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: g === x.id ? colors.ink : colors.surface2 }}>
            <Text variant="small" style={{ fontFamily: fonts.semibold }} color={g === x.id ? colors.bg : colors.ink}>
              {x.name}
            </Text>
          </Press>
        ))}
      </ScrollView>
      {podium.length ? (
        <View key={g} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
          {podium.map((idx) => {
            const r = rows[idx];
            const h = [128, 100, 84][idx];
            return (
              <View key={idx} style={{ width: 96, alignItems: 'center' }}>
                <Press disabled={r.is_me} onPress={() => router.push({ pathname: '/user/[username]', params: { username: r.username } })}>
                  <Avatar uri={r.avatar_url} name={r.display_name ?? r.username} size={idx === 0 ? 60 : 48} ring={idx === 0} />
                </Press>
                <Text variant="small" style={{ fontFamily: fonts.semibold, marginTop: spacing.sm }} numberOfLines={1}>
                  {r.is_me ? 'You' : (r.display_name ?? r.username).split(' ')[0]}
                </Text>
                <Text variant="caption" tone="muted" style={{ fontFamily: fonts.mono }}>
                  {mmss(r.time_seconds)}
                </Text>
                <Animated.View entering={FadeInUp.delay(80 * idx).springify().damping(16)} style={{ marginTop: spacing.sm, width: '100%', height: h, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', paddingTop: spacing.sm, backgroundColor: idx === 0 ? colors.accent : colors.surface2 }}>
                  <Text variant="small" style={{ fontFamily: fonts.bold }} color={idx === 0 ? colors.onAccent : colors.muted}>
                    {idx + 1}
                  </Text>
                </Animated.View>
              </View>
            );
          })}
        </View>
      ) : null}
      <Board rows={rows} played={g === 'week' || (!!challenge?.attempt && challenge.attempt.status !== 'in_progress')} week={g === 'week'} />
      <Text variant="caption" tone="faint" align="center" style={{ marginTop: spacing.base, paddingHorizontal: spacing.lg }}>
        {g === 'week' ? 'Sum of this week’s times. A game not solved counts as 3 minutes.' : 'Sorted by time. Each miss or hint adds 10 seconds.'}
      </Text>
    </Screen>
  );
}
