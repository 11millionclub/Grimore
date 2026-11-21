import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Board } from '@/components/board';
import { GameGlyph } from '@/components/game-glyph';
import { CalendarBlankIcon, CheckCircleIcon, FireIcon, SkullIcon, TimerIcon } from '@/components/icons';
import { Press, Screen, SectionHead, Segmented, Skeleton, Stagger, Text } from '@/components/ui';
import { useMyId, useTodayGames } from '@/hooks/queries';
import { gameMeta, getGameStreak, getLeaderboard, mmss, type GameId, type GameState } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { useCountdown } from '@/hooks/use-countdown';

const openGame = (g: GameState) => router.push({ pathname: '/game/[id]', params: { id: g.id } });

export default function Play() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const games = useTodayGames();
  const left = useCountdown();
  const streak = useQuery({ queryKey: ['gameStreak', me], queryFn: () => getGameStreak(me) });
  const [board, setBoard] = useState<GameId>('hangman');
  const list = games.data ?? [];
  const done = list.filter((g) => g.attempt && g.attempt.status !== 'in_progress').length;
  const selected = list.find((g) => g.game === board);
  const rows = useQuery({ queryKey: ['board', selected?.id], queryFn: () => getLeaderboard(selected!.id), enabled: !!selected });
  const firstOpen = list.findIndex((g) => !g.attempt || g.attempt.status === 'in_progress');

  return (
    <Screen title="Play" tabs refreshing={games.isRefetching} onRefresh={() => Promise.all([games.refetch(), rows.refetch(), streak.refetch()])}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <FireIcon size={28} weight="fill" color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="title">
                {streak.data?.current_streak ?? 0} {streak.data?.current_streak === 1 ? 'day' : 'days'} in a row
              </Text>
              <Text variant="small" tone="muted">
                {done} of {list.length || 4} games done today
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(list.length ? list : [0, 1, 2, 3]).map((g, i) => (
                <View key={i} style={{ width: 6, height: 28, borderRadius: 3, backgroundColor: typeof g === 'object' && g.attempt && g.attempt.status !== 'in_progress' ? colors.accent : colors.surface3 }} />
              ))}
            </View>
          </View>
          <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TimerIcon size={15} color={colors.muted} />
            <Text variant="small" tone="muted">
              New games in{' '}
              <Text variant="small" style={{ fontFamily: fonts.monoBold }}>
                {left}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        {games.isLoading
          ? [0, 1, 2, 3].map((k) => <Skeleton key={k} width="47.5%" height={190} rounded={radius.card} />)
          : list.map((g, i) => {
              const meta = gameMeta(g.game);
              const finished = g.attempt && g.attempt.status !== 'in_progress';
              const featured = i === firstOpen && i === 0;
              return (
                <Stagger key={g.id} i={i} style={{ width: '47.5%' }}>
                  <Press onPress={() => openGame(g)} style={{ aspectRatio: 1 / 1.12, borderRadius: radius.card, padding: spacing.base, backgroundColor: featured ? colors.accent : colors.surface, overflow: 'hidden' }}>
                    <GameGlyph id={g.game} onAccent={featured} cover={g.payload.cover_url} />
                    <View style={{ marginTop: 'auto' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 18 }} tone={featured ? 'onAccent' : 'ink'}>
                          {meta.name}
                        </Text>
                        {finished ? g.attempt!.status === 'won' ? <CheckCircleIcon size={20} weight="fill" color={colors.good} /> : <SkullIcon size={20} weight="fill" color={colors.muted} /> : null}
                      </View>
                      <Text variant="caption" tone={featured ? 'onAccent' : 'muted'} style={{ marginTop: 2, opacity: featured ? 0.75 : 1 }}>
                        {finished ? (g.attempt!.status === 'won' ? `Done in ${mmss(g.attempt!.time_seconds ?? 0)}` : 'Back tomorrow') : g.attempt ? 'In progress' : meta.desc}
                      </Text>
                      <Text variant="micro" tone={featured ? 'onAccent' : 'faint'} style={{ marginTop: 6, opacity: featured ? 0.6 : 1 }}>
                        #{g.number}
                      </Text>
                    </View>
                  </Press>
                </Stagger>
              );
            })}
      </View>
      {!games.isLoading && list.length === 0 ? (
        <Text variant="callout" tone="muted" align="center" style={{ padding: spacing.xl }}>
          Today’s games are being prepared. Pull to refresh in a moment.
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title="Today, among people you follow" action="See all" onAction={() => router.push({ pathname: '/leaderboard', params: { game: board } })} />
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <Segmented value={board} onChange={setBoard} options={list.map((g) => ({ value: g.game, label: gameMeta(g.game).name.split(' ')[0] }))} />
        </View>
        <Board rows={rows.data ?? []} played={!!selected?.attempt && selected.attempt.status !== 'in_progress'} compact />
      </View>

      <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, padding: spacing.base }}>
          <CalendarBlankIcon size={22} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Same games for everyone</Text>
            <Text variant="small" tone="muted">
              Every reader gets the same four games each day. Each miss or hint adds 10 seconds.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
