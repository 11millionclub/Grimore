import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { ChartBarIcon } from '@/components/icons';
import { Avatar, EmptyState, Press, Progress, Skeleton, Stagger, Text } from '@/components/ui';
import { useReadingGoal, useReadingStats } from '@/hooks/queries';
import { friendsBooksThisYear, monthName } from '@/services/stats';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { fmt } from '@/utils/dates';

const M = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function StatsView({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const stats = useReadingStats(userId);
  const goal = useReadingGoal(userId);
  const friends = useQuery({ queryKey: ['friendsBooks', userId], queryFn: () => friendsBooksThisYear(userId) });
  const s = stats.data;
  if (stats.isLoading || !s)
    return (
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Skeleton height={180} rounded={radius.card} />
        <Skeleton height={140} rounded={radius.card} />
      </View>
    );
  if (!s.totalRead && !s.sessionsCount) return <EmptyState title="No reading yet" body="Log pages or finish a book and your stats start here." />;
  const max = Math.max(1, ...s.pagesByMonth);
  const hmax = Math.max(1, ...s.hours);
  const nowMonth = new Date().getMonth();
  const card = { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base } as const;
  const tiles: [string, string][] = [
    [String(s.booksRead), `books in ${s.year}${goal.data?.target ? ` · goal ${goal.data.target}` : ''}`],
    [fmt(s.pages), 'pages read'],
    [String(s.pagesPerDay), 'pages a day'],
    [s.avgRating ? s.avgRating.toFixed(1) : '—', 'average rating'],
  ];
  const fmax = Math.max(1, ...(friends.data ?? []).map((f) => f.count));
  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {tiles.map(([v, l], i) => (
          <Stagger key={l} i={i} style={{ width: '47.5%' }}>
            <Press disabled={i !== 0} onPress={() => router.push('/goals')} style={card}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 28, lineHeight: 30, letterSpacing: -0.9 }}>{v}</Text>
              <Text variant="small" tone="muted">
                {l}
              </Text>
            </Press>
          </Stagger>
        ))}
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="bodyStrong">Pages per month</Text>
          <Text variant="caption" tone="muted">
            {s.year}
          </Text>
        </View>
        <View style={{ marginTop: spacing.base, height: 128, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          {s.pagesByMonth.map((p, i) => (
            <View key={i} style={{ flex: 1, height: `${Math.max(2, (p / max) * 100)}%`, borderRadius: 5, backgroundColor: i === s.bestMonth ? colors.accent : i === nowMonth ? colors.ink : colors.surface3, opacity: i === nowMonth && i !== s.bestMonth ? 0.8 : 1 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {M.map((m, i) => (
            <Text key={i} variant="micro" align="center" style={{ flex: 1, fontFamily: i === s.bestMonth ? fonts.bold : fonts.regular }} tone={i === s.bestMonth ? 'accent' : 'faint'}>
              {m}
            </Text>
          ))}
        </View>
        {s.bestMonth !== null ? (
          <Text variant="small" tone="muted" style={{ marginTop: spacing.md }}>
            {monthName(s.bestMonth)} was your best month:{' '}
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              {fmt(s.pagesByMonth[s.bestMonth])}
            </Text>{' '}
            pages.
          </Text>
        ) : null}
      </View>

      {s.genres.length ? (
        <View style={card}>
          <Text variant="bodyStrong">Genres</Text>
          <View style={{ marginTop: spacing.md, height: 12, flexDirection: 'row', gap: 2, borderRadius: 6, overflow: 'hidden' }}>
            {s.genres.map((g, i) => (
              <View key={g.name} style={{ width: `${g.pct}%`, height: '100%', backgroundColor: colors.accent, opacity: 1 - i * 0.18 }} />
            ))}
          </View>
          <View style={{ marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
            {s.genres.map((g, i) => (
              <View key={g.name} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.md }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, opacity: 1 - i * 0.18 }} />
                <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
                  {g.name}
                </Text>
                <Text variant="small" tone="muted">
                  {g.pct}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {s.sessionsCount ? (
        <View style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="bodyStrong">When you read</Text>
            {s.peakHour !== null ? (
              <Text variant="caption" tone="muted">
                peak at {s.peakHour}:00
              </Text>
            ) : null}
          </View>
          <View style={{ marginTop: spacing.base, height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            {s.hours.map((h, i) => (
              <View key={i} style={{ flex: 1, height: `${Math.max(4, (h / hmax) * 100)}%`, borderRadius: 3, backgroundColor: i === s.peakHour ? colors.accent : colors.surface3 }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {['0h', '6h', '12h', '18h', '23h'].map((t) => (
              <Text key={t} variant="micro" tone="faint" style={{ fontFamily: fonts.regular }}>
                {t}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {s.sessionsCount ? (
        <View style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="bodyStrong">Reading days</Text>
            <Text variant="caption" tone="muted">
              last 20 weeks
            </Text>
          </View>
          <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: 20 }).map((_, w) => (
              <View key={w} style={{ flex: 1, gap: 3 }}>
                {s.heat.slice(w * 7, w * 7 + 7).map((v, d) => {
                  const hmaxD = Math.max(1, ...s.heat);
                  return <View key={d} style={{ aspectRatio: 1, borderRadius: 3, backgroundColor: v ? colors.accent : colors.surface3, opacity: v ? 0.25 + (v / hmaxD) * 0.75 : 1 }} />;
                })}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {(friends.data ?? []).length > 1 ? (
        <View style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="bodyStrong">You and people you follow</Text>
            <ChartBarIcon size={18} color={colors.muted} />
          </View>
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {(friends.data ?? []).map((f) => (
              <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar uri={f.avatar_url} name={f.display_name ?? f.username} size={26} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text variant="small" style={f.me ? { fontFamily: fonts.semibold } : undefined}>
                      {f.me ? 'You' : (f.display_name ?? f.username).split(' ')[0]}
                    </Text>
                    <Text variant="small" tone="muted">
                      {f.count} books
                    </Text>
                  </View>
                  <Progress value={f.count / fmax} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
