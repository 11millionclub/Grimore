import { View } from 'react-native';

import { AchievementGrid } from '@/components/achievement-grid';
import { TopBar } from '@/components/top-bar';
import { ErrorState, Screen, SectionHeader, Skeleton, Stat, Surface, Text } from '@/components/ui';
import { GAME_META, type GameType, type Progress } from '@/features/games/types';
import { useAchievements, useMyId, useProgress } from '@/hooks/queries';
import { radius, spacing, useTheme } from '@/theme';
import { addDays, utcDateKey } from '@/utils/dates';

const WEEKS = 12;

export default function Streak() {
  const userId = useMyId()!;
  const { colors } = useTheme();
  const progress = useProgress(userId);
  const achievements = useAchievements(userId);
  const p = progress.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Your streak" />
      <Screen edgeTop={false}>
        {progress.isError ? <ErrorState onRetry={() => void progress.refetch()} /> : null}

        <View style={{ alignItems: 'center', gap: spacing.xs, marginVertical: spacing.xl }}>
          <Text variant="display" style={{ fontSize: 72, lineHeight: 76 }} tone={p?.played_today ? 'accent' : 'ink'}>
            {p?.current_streak ?? 0}
          </Text>
          <Text variant="eyebrow">{p?.current_streak === 1 ? 'day streak' : 'day streak'}</Text>
          <Text variant="callout" tone="muted" align="center" style={{ maxWidth: 300, marginTop: spacing.sm }}>
            {!p ? '' : p.played_today ? 'Today counts. See you tomorrow.' : p.current_streak > 0 ? 'Play any challenge today to keep it going.' : 'Play any challenge to begin a new streak.'}
          </Text>
        </View>

        <Surface style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.xxl }}>
          <Stat align="center" value={p?.longest_streak ?? '–'} label="longest" />
          <Stat align="center" value={p?.completed_days ?? '–'} label="days played" />
          <Stat align="center" value={p?.perfect_days ?? '–'} label="perfect days" />
          <Stat align="center" value={p?.total_xp ?? '–'} label="XP" />
        </Surface>

        <SectionHeader eyebrow={`Last ${WEEKS} weeks`} title="Calendar" />
        {p ? <Calendar progress={p} /> : <Skeleton height={130} />}
        <View style={{ flexDirection: 'row', gap: spacing.base, marginTop: spacing.md, marginBottom: spacing.xxl }}>
          <LegendDot color={colors.surfaceMuted} label="Not played" />
          <LegendDot color={colors.accentSoft} label="Played" />
          <LegendDot color={colors.accent} label="Perfect Day" />
        </View>

        <SectionHeader eyebrow="By game" title="Your record" />
        <View style={{ gap: spacing.md, marginBottom: spacing.xxl }}>
          {(['bookle', 'cover_reveal', 'quiz'] as GameType[]).map((g) => {
            const s = p?.games[g];
            return (
              <Surface key={g} style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text variant="title3">{GAME_META[g].name}</Text>
                  <Text variant="caption">{s ? `${Math.round((s.won / Math.max(1, s.played)) * 100)}% solved` : 'Not played yet'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.xl }}>
                  <Stat value={s?.played ?? 0} label="played" />
                  <Stat value={s?.current_streak ?? 0} label="streak" />
                  <Stat value={s?.longest_streak ?? 0} label="best" />
                </View>
                {g === 'bookle' && s ? <Distribution dist={s.distribution} /> : null}
              </Surface>
            );
          })}
        </View>

        <SectionHeader eyebrow="Milestones" title="Achievements" />
        {achievements.data ? <AchievementGrid items={achievements.data} /> : <Skeleton height={200} />}

        <Text variant="caption" align="center" style={{ marginTop: spacing.xxl }}>
          Streaks count UTC days, the same clock as the puzzles. Missing a day starts a fresh streak; your longest is always kept.
        </Text>
      </Screen>
    </View>
  );
}

function Calendar({ progress }: { progress: Progress }) {
  const { colors } = useTheme();
  const byDate = new Map(progress.calendar.map((d) => [d.date, d]));
  const today = utcDateKey();
  const todayDow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -(WEEKS - 1) * 7 - todayDow);
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${progress.calendar.length} active days in the last ${WEEKS} weeks`}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flex: 1, gap: 4 }}>
          {week.map((day) => {
            const d = byDate.get(day);
            const future = day > today;
            return (
              <View
                key={day}
                style={{
                  aspectRatio: 1,
                  borderRadius: radius.xs,
                  backgroundColor: future ? 'transparent' : d?.perfect ? colors.accent : d ? colors.accentSoft : colors.surfaceMuted,
                  borderWidth: day === today ? 1.5 : 0,
                  borderColor: colors.ink,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Distribution({ dist }: { dist: Record<string, number> }) {
  const { colors } = useTheme();
  const keys = ['1', '2', '3', '4', '5', '6', 'x'];
  const max = Math.max(1, ...keys.map((k) => dist[k] ?? 0));
  return (
    <View style={{ gap: 4 }}>
      {keys.map((k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="caption" style={{ width: 12 }}>
            {k === 'x' ? '×' : k}
          </Text>
          <View style={{ flex: 1, height: 14, justifyContent: 'center' }}>
            <View style={{ width: `${((dist[k] ?? 0) / max) * 100}%`, minWidth: 14, height: 14, borderRadius: 3, backgroundColor: k === 'x' ? colors.borderStrong : colors.olive, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 }}>
              <Text style={{ fontSize: 9.5, color: k === 'x' ? colors.ink : colors.onOlive }}>{dist[k] ?? 0}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}
