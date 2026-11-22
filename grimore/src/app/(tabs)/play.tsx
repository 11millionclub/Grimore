import { AppActions } from '@/components/app-actions';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Board } from '@/components/board';
import { CheckCircleIcon, DetectiveIcon, ImageSquareIcon, ListNumbersIcon, SkullIcon, TextAaIcon, type IconProps } from '@/components/icons';
import { Press, Screen, SectionHead, Segmented, Skeleton, Stagger, Text } from '@/components/ui';
import { useMyId, useTodayGames } from '@/hooks/queries';
import { gameMeta, getGameStreak, getLeaderboard, mmss, type GameId, type GameState } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { useCountdown } from '@/hooks/use-countdown';

const GAME_ICONS: Record<GameId, React.ComponentType<IconProps>> = { hangman: TextAaIcon, cover: ImageSquareIcon, clues: DetectiveIcon, timeline: ListNumbersIcon };

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

  const n = streak.data?.current_streak ?? 0;
  return (
    <Screen title="Play" tabs actions={<AppActions />} refreshing={games.isRefetching} onRefresh={() => Promise.all([games.refetch(), rows.refetch(), streak.refetch()])}>
      <View style={{ paddingHorizontal: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24 }} tone="accent">
              {n}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyStrong">{n === 1 ? 'day in a row' : 'days in a row'}</Text>
            <Text variant="small" tone="muted">
              {done} of {list.length || 4} done · new games in <Text variant="small" style={{ fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] }}>{left}</Text>
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {games.isLoading
            ? [0, 1, 2, 3].map((k) => <Skeleton key={k} height={76} rounded={radius.card} />)
            : list.map((g, i) => {
                const meta = gameMeta(g.game);
                const Icon = GAME_ICONS[g.game];
                const finished = !!g.attempt && g.attempt.status !== 'in_progress';
                const won = g.attempt?.status === 'won';
                const next = i === firstOpen;
                const status = finished ? (won ? mmss(g.attempt!.time_seconds ?? 0) : 'Tomorrow') : g.attempt ? 'Resume' : 'Play';
                return (
                  <Stagger key={g.id} i={i}>
                    <Press
                      accessibilityRole="button"
                      accessibilityLabel={`${meta.name}. ${finished ? (won ? `Solved in ${status}` : 'Not solved, back tomorrow') : meta.desc}`}
                      onPress={() => openGame(g)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        minHeight: 76,
                        paddingHorizontal: spacing.base,
                        paddingVertical: spacing.md,
                        borderRadius: radius.card,
                        backgroundColor: colors.surface,
                        borderWidth: next ? 1.5 : 1,
                        borderColor: next ? colors.accent : colors.line,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: finished ? colors.surface2 : colors.accentSoft }}>
                        <Icon size={22} weight={finished ? 'regular' : 'fill'} color={finished ? colors.muted : colors.accent} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="h2" numberOfLines={1} style={{ fontSize: 16 }}>
                          {meta.name}
                        </Text>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          #{g.number} · {meta.desc}
                        </Text>
                      </View>
                      {finished ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {won ? <CheckCircleIcon size={18} weight="fill" color={colors.good} /> : <SkullIcon size={18} color={colors.muted} />}
                          <Text variant="small" tone={won ? 'ink' : 'muted'} style={{ fontVariant: ['tabular-nums'] }}>
                            {status}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ paddingHorizontal: 14, height: 32, borderRadius: radius.full, justifyContent: 'center', backgroundColor: next ? colors.accent : colors.surface2 }}>
                          <Text variant="small" style={{ fontFamily: fonts.semibold }} color={next ? colors.onAccent : colors.ink}>
                            {status}
                          </Text>
                        </View>
                      )}
                    </Press>
                  </Stagger>
                );
              })}
        </View>
      </View>
      {!games.isLoading && list.length === 0 ? (
        <Text variant="callout" tone="muted" align="center" style={{ padding: spacing.xl }}>
          Today’s games are being prepared. Pull to refresh in a moment.
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title="Friends today" action="See all" onAction={() => router.push({ pathname: '/leaderboard', params: { game: board } })} />
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <Segmented value={board} onChange={setBoard} options={list.map((g) => ({ value: g.game, label: gameMeta(g.game).name.split(' ')[0] }))} />
        </View>
        <Board rows={rows.data ?? []} played={!!selected?.attempt && selected.attempt.status !== 'in_progress'} compact />
      </View>

      <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
        <Text variant="caption" tone="muted" align="center">
          Same four games for every reader, once a day. Each miss or hint adds 10 seconds.
        </Text>
      </View>
    </Screen>
  );
}
