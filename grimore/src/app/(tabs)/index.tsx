import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { DailyStrip } from '@/components/games/daily-strip';
import { StreakBadge } from '@/components/games/streak-badge';
import { Shelf } from '@/components/shelf';
import { Avatar, BookCover, Button, EmptyState, IconButton, ProgressBar, Screen, SectionHeader, Skeleton, Surface, Text } from '@/components/ui';
import { useFavoriteGenres, useMyId, useMyProfile, useProgress, useReadingGoal, useTodayChallenges } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { getSuggestions } from '@/services/catalogue';
import { listLibrary } from '@/services/library';
import { getActivityFromFollowed } from '@/services/social';
import { spacing } from '@/theme';
import { greetingFor, relativeTime } from '@/utils/dates';

export default function Home() {
  const userId = useMyId()!;
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const today = useTodayChallenges();
  const progress = useProgress(userId);
  const goal = useReadingGoal(userId);
  const genres = useFavoriteGenres(userId);

  const reading = useQuery({ queryKey: qk.library('home-reading'), queryFn: () => listLibrary({ userId, status: 'reading', sort: 'updated' }) });
  const recent = useQuery({ queryKey: qk.library('home-recent'), queryFn: () => listLibrary({ userId, sort: 'added' }) });
  const activity = useQuery({ queryKey: ['activity', userId], queryFn: () => getActivityFromFollowed(userId) });
  const libraryIds = (recent.data?.items ?? []).map((e) => e.book.id);
  const suggestions = useQuery({
    queryKey: [...qk.suggestions, (genres.data ?? []).map((g) => g.id).join(',')],
    queryFn: () => getSuggestions((genres.data ?? []).map((g) => g.id), libraryIds),
    enabled: genres.isSuccess && recent.isSuccess,
  });

  const firstName = profile.data?.display_name?.split(' ')[0] ?? '';
  const current = reading.data?.items[0];
  const completedToday = (today.data ?? []).filter((c) => c.attempt && c.attempt.status !== 'in_progress').length;

  const refresh = () => {
    void queryClient.invalidateQueries();
  };

  return (
    <Screen tabBarInset onRefresh={refresh} refreshing={false}>
      {/* Masthead */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xxl }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text variant="title1" accessibilityRole="header">
            {greetingFor()}
            {firstName ? `,\n${firstName}.` : '.'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <StreakBadge days={progress.data?.current_streak ?? 0} active={!!progress.data?.played_today} />
          <IconButton icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        </View>
      </View>

      {/* Daily challenges */}
      <View style={{ marginBottom: spacing.xxl }}>
        <SectionHeader
          eyebrow={completedToday === 3 ? 'Perfect Day' : `${completedToday} of 3 today`}
          title="Today’s challenges"
          actionLabel="Play"
          onAction={() => router.push('/play')}
        />
        <DailyStrip challenges={today.data} loading={today.isLoading} />
      </View>

      {/* Currently reading */}
      <View style={{ marginBottom: spacing.xxl }}>
        <SectionHeader eyebrow="On the nightstand" title="Currently reading" actionLabel={reading.data && reading.data.items.length > 1 ? 'All' : undefined} onAction={() => router.push({ pathname: '/library', params: { status: 'reading' } })} />
        {reading.isLoading ? (
          <Skeleton height={168} rounded={16} />
        ) : current ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/book/[id]', params: { id: current.book.id } })}>
            <Surface style={{ flexDirection: 'row', gap: spacing.base, alignItems: 'center' }}>
              <BookCover title={current.book.title} author={current.book.authors} uri={current.book.cover_url} width={84} accessible={false} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <View style={{ gap: 2 }}>
                  <Text variant="title3" numberOfLines={2}>
                    {current.book.title}
                  </Text>
                  <Text variant="caption">{current.book.authors}</Text>
                </View>
                <ProgressBar value={(current.progress_percent ?? 0) / 100} />
                <Text variant="caption">
                  {current.progress_percent ? `${current.progress_percent}% · ` : ''}
                  {current.started_on ? `since ${new Date(`${current.started_on}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'just started'}
                </Text>
              </View>
            </Surface>
          </Pressable>
        ) : (
          <Surface muted>
            <EmptyState compact icon="book-open" title="Nothing on the nightstand" body="Start a book and track your progress here." actionLabel="Find a book" onAction={() => router.push('/add-book')} />
          </Surface>
        )}
      </View>

      {/* Reading goal */}
      <View style={{ marginBottom: spacing.xxl }}>
        {goal.data?.target ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="eyebrow">{goal.data.year} reading goal</Text>
              <Text variant="caption">
                {goal.data.read} of {goal.data.target} books
              </Text>
            </View>
            <ProgressBar value={goal.data.read / goal.data.target} tone="olive" height={6} />
          </Pressable>
        ) : goal.isSuccess ? (
          <Surface muted style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">Set a {new Date().getFullYear()} reading goal</Text>
              <Text variant="caption">A gentle target, not a race.</Text>
            </View>
            <Button title="Set goal" size="sm" variant="secondary" onPress={() => router.push('/profile')} />
          </Surface>
        ) : null}
      </View>

      {/* Recently added */}
      {recent.data && recent.data.items.length > 0 ? (
        <View style={{ marginBottom: spacing.xxl }}>
          <SectionHeader eyebrow="Your library" title="Recently added" actionLabel="Library" onAction={() => router.push('/library')} />
          <Shelf books={recent.data.items.slice(0, 10).map((e) => ({ ...e.book }))} />
        </View>
      ) : null}

      {/* Suggestions */}
      <View style={{ marginBottom: spacing.xxl }}>
        <SectionHeader eyebrow="Chosen for you" title={genres.data?.length ? `Because you love ${genres.data[0].name.toLowerCase()}` : 'Classics worth your evening'} />
        <Shelf books={suggestions.data ?? []} loading={suggestions.isLoading || !genres.isSuccess} />
      </View>

      {/* Followed readers */}
      <View>
        <SectionHeader eyebrow="Your circle" title="What readers are reading" actionLabel="Social" onAction={() => router.push('/social')} />
        {activity.data && activity.data.length > 0 ? (
          <View style={{ gap: spacing.base }}>
            {activity.data.map((a) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                onPress={() => a.book && router.push({ pathname: '/book/[id]', params: { id: a.book.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <Avatar name={a.user?.display_name ?? a.user?.username ?? '?'} uri={a.user?.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="callout" numberOfLines={2}>
                    <Text variant="callout" style={{ fontWeight: '600' }}>
                      {a.user?.display_name ?? a.user?.username}
                    </Text>
                    {a.status === 'reading' ? ' started ' : ' finished '}
                    <Text variant="callout" style={{ fontStyle: 'italic' }}>
                      {a.book?.title}
                    </Text>
                  </Text>
                  <Text variant="caption">{relativeTime(a.updated_at)}</Text>
                </View>
                {a.book ? <BookCover title={a.book.title} uri={a.book.cover_url} size="xs" accessible={false} /> : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Surface muted>
            <EmptyState compact icon="users" title="Reading is better together" body="Follow readers whose taste you trust to see what they pick up next." actionLabel="Find readers" onAction={() => router.push('/find-readers')} />
          </Surface>
        )}
      </View>
    </Screen>
  );
}
