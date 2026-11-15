import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, ErrorState, Icon, Screen, Skeleton, Text } from '@/components/ui';
import { GAME_META, PERFECT_DAY_BONUS, type Challenge, type GameType } from '@/features/games/types';
import { useMyId, useProgress, useTodayChallenges } from '@/hooks/queries';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { formatChallengeDate, formatCountdown, msUntilNextChallenge, utcDateKey } from '@/utils/dates';

const ORDER: GameType[] = ['bookle', 'cover_reveal', 'quiz'];

export default function Play() {
  const { colors } = useTheme();
  const userId = useMyId()!;
  const today = useTodayChallenges();
  const progress = useProgress(userId);
  const [countdown, setCountdown] = useState(formatCountdown(msUntilNextChallenge()));
  useEffect(() => {
    const t = setInterval(() => setCountdown(formatCountdown(msUntilNextChallenge())), 30_000);
    return () => clearInterval(t);
  }, []);

  const done = (today.data ?? []).filter((c) => c.attempt && c.attempt.status !== 'in_progress').length;
  const dateKey = today.data?.[0]?.challenge_date ?? utcDateKey();

  return (
    <Screen tabBarInset onRefresh={() => void today.refetch()} refreshing={today.isRefetching}>
      {/* The Daily: a distinct, ink-dark masthead for the games section */}
      <View style={{ backgroundColor: colors.accent, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, marginBottom: spacing.xl, overflow: 'hidden' }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: -10, top: -10, width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}
        />
        <View style={{ gap: spacing.xs }}>
          <Text variant="eyebrow" tone="onAccent" style={{ opacity: 0.75 }}>
            The Daily · {formatChallengeDate(dateKey)}
          </Text>
          <Text variant="title1" tone="onAccent" accessibilityRole="header">
            Three puzzles.{'\n'}One shared day.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          <MastStat value={progress.data?.current_streak ?? 0} label="day streak" />
          <MastStat value={`${done}/3`} label="played today" />
          <MastStat value={progress.data?.total_xp ?? 0} label="total XP" />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${done} of 3 completed. Perfect Day bonus ${PERFECT_DAY_BONUS} XP`}>
          {ORDER.map((g, i) => (
            <View key={g} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < done ? colors.onAccent : 'rgba(255,255,255,0.25)' }} />
          ))}
        </View>
        <Text variant="caption" tone="onAccent" style={{ opacity: 0.8 }}>
          {done === 3 ? `Perfect Day. +${PERFECT_DAY_BONUS} XP bonus earned.` : `Finish all three for a Perfect Day (+${PERFECT_DAY_BONUS} XP). New puzzles in ${countdown}.`}
        </Text>
      </View>

      {today.isError ? <ErrorState onRetry={() => void today.refetch()} /> : null}

      <View style={{ gap: spacing.md }}>
        {today.isLoading
          ? ORDER.map((g) => <Skeleton key={g} height={124} rounded={radius.lg} />)
          : ORDER.map((g, i) => <GameCard key={g} index={i + 1} game={g} challenge={today.data?.find((c) => c.game === g)} />)}
      </View>

      <Button title="Streaks & achievements" icon="award" variant="secondary" fullWidth onPress={() => router.push('/play/streak')} style={{ marginTop: spacing.xl }} />
      <Text variant="caption" align="center" style={{ marginTop: spacing.base }}>
        Everyone plays the same puzzles. Days change at midnight UTC.
      </Text>
    </Screen>
  );
}

function MastStat({ value, label }: { value: string | number; label: string }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={{ fontFamily: fonts.serifSemibold, fontSize: 26, lineHeight: 30, color: colors.onAccent }}>{value}</Text>
      <Text variant="caption" tone="onAccent" style={{ opacity: 0.75 }}>
        {label}
      </Text>
    </View>
  );
}

function GameCard({ game, challenge, index }: { game: GameType; challenge?: Challenge; index: number }) {
  const { colors } = useTheme();
  const meta = GAME_META[game];
  const status = challenge?.attempt?.status;
  const done = status === 'won' || status === 'lost';
  const cta = !challenge ? 'Not available' : done ? 'See result' : status === 'in_progress' ? 'Continue' : 'Play';

  return (
    <Pressable
      disabled={!challenge}
      accessibilityRole="button"
      accessibilityLabel={`${meta.name}. ${meta.tagline}. ${done ? (status === 'won' ? 'Solved' : 'Played') : cta}`}
      onPress={() => router.push(meta.route as Href)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : !challenge ? 0.5 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.serifItalic, fontSize: 30, color: colors.inkSubtle, width: 24 }}>{index}</Text>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="title3">{meta.name}</Text>
        <Text variant="caption">{meta.tagline}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
          {done ? (
            <>
              <Icon name={status === 'won' ? 'check-circle' : 'circle'} size={13} tone={status === 'won' ? 'olive' : 'inkMuted'} />
              <Text variant="caption" tone={status === 'won' ? 'olive' : 'muted'}>
                {status === 'won' ? 'Solved' : 'Played'} · +{challenge?.attempt?.xp_awarded ?? 0} XP
              </Text>
            </>
          ) : (
            <Text variant="caption" tone="accent">
              +{meta.xp} XP
            </Text>
          )}
        </View>
      </View>
      <View
        style={{
          height: 40,
          paddingHorizontal: spacing.base,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? colors.surfaceMuted : colors.ink,
        }}
      >
        <Text variant="button" style={{ color: done ? colors.ink : colors.canvas, fontSize: 13.5 }}>
          {cta}
        </Text>
      </View>
    </Pressable>
  );
}
