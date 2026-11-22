import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CluesGame } from '@/components/games/clues';
import { CoverGame } from '@/components/games/cover';
import { Hangman } from '@/components/games/hangman';
import { TimelineGame } from '@/components/games/timeline';
import { GameGlyph } from '@/components/game-glyph';
import { ArrowRightIcon, ClockIcon, ShareFatIcon, SkullIcon, TimerIcon, TrophyIcon, XIcon } from '@/components/icons';
import { Avatar, Btn, Cover, ErrorState, IconBtn, Text, toast, shareText as shareSheet } from '@/components/ui';
import { useCountdown } from '@/hooks/use-countdown';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import {
  gameMeta,
  getGameState,
  getLeaderboard,
  getTodayGames,
  guessClues,
  guessCover,
  guessLetter,
  liveSeconds,
  mmss,
  startGame,
  submitTimeline,
  takeHint,
  type GameState,
} from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { shareText } from '@/utils/game-ui';

type Phase = 'intro' | 'count' | 'play';

export default function Game() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ['game', id], queryFn: () => getGameState(id) });
  const s = state.data;
  const finished = s?.attempt && s.attempt.status !== 'in_progress';
  const [phase, setPhase] = useState<Phase>('intro');
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(() => Date.now());
  const [pulse, setPulse] = useState(0);
  const lastPenalty = useRef<number | null>(null);

  // Resume a game already in progress without the intro.
  const resumed = s?.attempt?.status === 'in_progress';
  const effective: Phase = resumed ? 'play' : phase;

  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) {
      startGame(id).then(
        (next) => {
          qc.setQueryData(['game', id], next);
          setPhase('play');
        },
        (e) => toast(toAppError(e).message),
      );
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 650);
    return () => clearTimeout(t);
  }, [phase, count, id, qc]);

  useEffect(() => {
    if (effective !== 'play' || finished) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [effective, finished]);

  useEffect(() => {
    const p = s?.attempt?.penalty_seconds ?? null;
    if (p !== null && lastPenalty.current !== null && p > lastPenalty.current) {
      const t = setTimeout(() => setPulse((x) => x + 1), 0);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      lastPenalty.current = p;
      return () => clearTimeout(t);
    }
    lastPenalty.current = p;
  }, [s?.attempt?.penalty_seconds]);

  const act = useMutation({
    mutationFn: (fn: () => Promise<GameState>) => fn(),
    onSuccess: (next) => {
      qc.setQueryData(['game', id], next);
      if (next.attempt && next.attempt.status !== 'in_progress') {
        if (Platform.OS !== 'web') void Haptics.notificationAsync(next.attempt.status === 'won' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
        void qc.invalidateQueries({ queryKey: qk.today });
        void qc.invalidateQueries({ queryKey: ['board'] });
        void qc.invalidateQueries({ queryKey: ['gameStreak'] });
      }
    },
    onError: (e) => toast(toAppError(e).message),
  });

  if (state.isError)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <ErrorState message={toAppError(state.error).message} onRetry={() => state.refetch()} />
      </View>
    );
  if (!s) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const meta = gameMeta(s.game);
  const seconds = liveSeconds(s, now);
  const run = (fn: () => Promise<GameState>) => act.mutate(fn);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.base, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn label="Close" filled onPress={() => router.back()}>
          <XIcon size={20} weight="bold" color={colors.ink} />
        </IconBtn>
        <View style={{ alignItems: 'center' }}>
          <Text variant="bodyStrong">{meta.name}</Text>
          <Text variant="caption" tone="muted">
            #{s.number}
          </Text>
        </View>
        <View>
          <Animated.View key={pulse} entering={pulse ? ZoomIn.springify().damping(10) : undefined} style={{ height: 40, minWidth: 76, borderRadius: radius.full, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: pulse && effective === 'play' && !finished ? colors.accentSoft : colors.surface2 }}>
            <ClockIcon size={14} color={pulse && !finished ? colors.accent : colors.ink} />
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 14 }} tone={pulse && !finished ? 'accent' : 'ink'}>
              {mmss(seconds)}
            </Text>
          </Animated.View>
          {pulse && !finished ? (
            <Animated.View key={`p${pulse}`} entering={FadeInDown.duration(150)} exiting={FadeOut.duration(400)} style={{ position: 'absolute', bottom: -22, right: 8, borderRadius: radius.full, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text variant="micro" tone="onAccent" style={{ fontFamily: fonts.bold }}>
                +10 s
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.md }}>
        {effective === 'play' || finished ? (
          <>
            {s.game === 'hangman' && <Hangman state={s} busy={act.isPending} onGuess={(l) => run(() => guessLetter(id, l))} onHint={() => run(() => takeHint(id))} />}
            {s.game === 'cover' && <CoverGame state={s} busy={act.isPending} onPick={(b) => run(() => guessCover(id, b))} onHint={() => run(() => takeHint(id))} />}
            {s.game === 'clues' && <CluesGame state={s} busy={act.isPending} onGuess={(b) => run(() => guessClues(id, b))} onHint={() => run(() => takeHint(id))} />}
            {s.game === 'timeline' && <TimelineGame state={s} busy={act.isPending} onSubmit={(o) => run(() => submitTimeline(id, o))} onHint={() => run(() => takeHint(id))} />}
          </>
        ) : effective === 'intro' ? (
          <Animated.View entering={FadeIn} style={{ flex: 1, paddingHorizontal: spacing.xl }}>
            <View style={{ marginTop: spacing.xxl, minWidth: 88, height: 88, paddingHorizontal: spacing.base, alignSelf: 'flex-start', borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <GameGlyph id={s.game} cover={s.payload.cover_url} />
            </View>
            <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 39, lineHeight: 42, marginTop: spacing.xl }}>
              {meta.name}
            </Text>
            <Text variant="body" tone="muted" style={{ marginTop: 4 }}>
              Game #{s.number} · the same for everyone today
            </Text>
            <View style={{ marginTop: spacing.xxl, gap: 14 }}>
              {meta.rules.map((r, i) => (
                <View key={r} style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="caption" tone="muted" style={{ fontFamily: fonts.bold }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>
                    {r}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 'auto' }}>
              <Text variant="small" tone="muted" align="center" style={{ marginBottom: spacing.md }}>
                The clock starts when the countdown ends.
              </Text>
              <Btn size="lg" full onPress={() => setPhase('count')}>
                Start
              </Btn>
            </View>
          </Animated.View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View key={count} entering={ZoomIn.springify().damping(12)}>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 120, lineHeight: 130 }} tone="accent">
                {count || 'Go'}
              </Text>
            </Animated.View>
          </View>
        )}
      </View>

      {finished ? <Result state={s} /> : null}
    </View>
  );
}

function Result({ state }: { state: GameState }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const left = useCountdown();
  const meta = gameMeta(state.game);
  const won = state.attempt?.status === 'won';
  const misses = state.attempt?.misses ?? 0;
  const tries = misses + 1;
  const board = useQuery({ queryKey: ['board', state.id], queryFn: () => getLeaderboard(state.id) });
  const today = useQuery({ queryKey: qk.today, queryFn: getTodayGames });
  const rows = board.data ?? [];
  const pos = rows.findIndex((r) => r.is_me);
  const ahead = pos > 0 ? rows[pos - 1] : null;
  const next = (today.data ?? []).find((g) => g.id !== state.id && (!g.attempt || g.attempt.status === 'in_progress'));
  const answer = state.solution?.book ?? null;
  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ position: 'absolute', inset: 0, backgroundColor: colors.bg, paddingTop: insets.top + 4, paddingBottom: insets.bottom + spacing.md }}>
      <View style={{ paddingHorizontal: spacing.base }}>
        <IconBtn label="Close" filled onPress={() => router.back()}>
          <XIcon size={20} weight="bold" color={colors.ink} />
        </IconBtn>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }}>
        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'center' }}>
          {won ? <TrophyIcon size={48} weight="fill" color={colors.accent} /> : <SkullIcon size={48} weight="fill" color={colors.muted} />}
          <Text variant="callout" tone="muted" style={{ fontFamily: fonts.semibold, marginTop: spacing.sm }}>
            {won ? (pos === 0 ? 'First place' : 'Solved') : 'Not this time'}
          </Text>
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 64, lineHeight: 72 }}>{won ? mmss(state.attempt?.time_seconds ?? 0) : '—'}</Text>
          <Text variant="body" tone="muted" align="center">
            {won ? (
              <>
                {tries} {tries === 1 ? 'try' : 'tries'}
                {pos >= 0 ? (
                  <>
                    {' · '}
                    <Text variant="body" style={{ fontFamily: fonts.semibold }}>
                      #{pos + 1}
                    </Text>{' '}
                    of {rows.length} among people you follow
                  </>
                ) : null}
              </>
            ) : (
              'You are not on today’s leaderboard.'
            )}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: spacing.lg }}>
            {Array.from({ length: Math.max(tries, 1) }).map((_, i) => (
              <Animated.View key={i} entering={ZoomIn.delay(250 + i * 70)} style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: i === tries - 1 && won ? colors.good : colors.accent }} />
            ))}
          </View>
          {answer ? (
            <View style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
              <Cover uri={answer.cover_url} title={answer.title} width={40} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">
                  Today’s book
                </Text>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {answer.title}
                </Text>
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {answer.authors.join(', ')}
                </Text>
              </View>
            </View>
          ) : null}
          {won && rows.length ? (
            <View style={{ marginTop: spacing.base, alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
              {rows.slice(Math.max(0, pos - 1), pos + 2).map((r, i) => (
                <View key={r.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, backgroundColor: r.is_me ? colors.accentSoft : 'transparent' }}>
                  <Text variant="small" tone="muted" style={{ width: 20, fontFamily: fonts.bold }}>
                    {r.rank}
                  </Text>
                  <Avatar uri={r.avatar_url} name={r.display_name ?? r.username} size={28} />
                  <Text variant="callout" style={{ flex: 1, fontFamily: fonts.medium }} numberOfLines={1}>
                    {r.is_me ? 'You' : r.display_name ?? r.username}
                  </Text>
                  <Text style={{ fontFamily: fonts.monoBold, fontSize: 14 }}>{mmss(r.time_seconds)}</Text>
                </View>
              ))}
              {ahead ? (
                <Text variant="small" tone="muted" style={{ paddingHorizontal: spacing.base, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
                  {(ahead.display_name ?? ahead.username).split(' ')[0]} was ahead by{' '}
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {mmss((state.attempt?.time_seconds ?? 0) - ahead.time_seconds)}
                  </Text>
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TimerIcon size={15} color={colors.muted} />
            <Text variant="small" tone="muted">
              Next {meta.name} in{' '}
              <Text variant="small" style={{ fontFamily: fonts.monoBold }}>
                {left}
              </Text>
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
        {next ? (
          <Btn size="lg" full icon={<ArrowRightIcon size={18} weight="bold" color={colors.onAccent} />} onPress={() => router.replace({ pathname: '/game/[id]', params: { id: next.id } })}>
            {`Play ${gameMeta(next.game).name}`}
          </Btn>
        ) : (
          <View style={{ borderRadius: radius.card, backgroundColor: colors.accentSoft, padding: spacing.md }}>
            <Text variant="callout" tone="accent" align="center" style={{ fontFamily: fonts.semibold }}>
              You played all four games today.
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Btn variant="secondary" size="lg" style={{ flex: 1 }} icon={<ShareFatIcon size={18} color={colors.ink} />} onPress={() => void shareSheet(shareText(meta.name, state.number, won, state.attempt?.time_seconds ?? null, misses))}>
            Share
          </Btn>
          <Btn
            variant="secondary"
            size="lg"
            style={{ flex: 1 }}
            onPress={() => {
              router.back();
              setTimeout(() => router.push({ pathname: '/leaderboard', params: { game: state.game } }), 80);
            }}
          >
            Leaderboard
          </Btn>
        </View>
      </View>
    </Animated.View>
  );
}
