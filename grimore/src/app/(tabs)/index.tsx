import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { DailyStrip } from '@/components/games/daily-strip';
import { StreakBadge } from '@/components/games/streak-badge';
import { BookShelf } from '@/components/nook/book-shelf';
import { LibraryScene } from '@/components/nook/library-scene';
import { Flourish, Glyph, OrnateFrame, Wordmark } from '@/components/ornaments';
import { Shelf } from '@/components/shelf';
import { Avatar, BookCover, Button, EmptyState, IconButton, ProgressBar, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useFavoriteGenres, useGenres, useMyId, useMyProfile, useProgress, useReadingGoal, useTodayChallenges } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { getSuggestions } from '@/services/catalogue';
import { getNextReads, getStatusCounts, listLibrary } from '@/services/library';
import { getActivityFromFollowed } from '@/services/social';
import { fonts, layout, radius, spacing, useTheme } from '@/theme';
import { greetingFor, relativeTime } from '@/utils/dates';

export default function Hall() {
  const userId = useMyId()!;
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const today = useTodayChallenges();
  const progress = useProgress(userId);
  const goal = useReadingGoal(userId);
  const favGenres = useFavoriteGenres(userId);
  const allGenres = useGenres();

  const counts = useQuery({ queryKey: [...qk.libraryAll, 'counts'], queryFn: () => getStatusCounts(userId) });
  const reading = useQuery({ queryKey: qk.library('home-reading'), queryFn: () => listLibrary({ userId, status: 'reading', sort: 'updated' }) });
  const recent = useQuery({ queryKey: qk.library('home-recent'), queryFn: () => listLibrary({ userId, sort: 'added' }) });
  const genreNames = Object.fromEntries((allGenres.data ?? []).map((g) => [g.id, g.name]));
  const favIds = (favGenres.data ?? []).map((g) => g.id);
  const nextReads = useQuery({
    queryKey: qk.library(`next-${favIds.join(',')}`),
    queryFn: () => getNextReads(userId, favIds, genreNames),
    enabled: favGenres.isSuccess && allGenres.isSuccess,
  });
  const activity = useQuery({ queryKey: ['activity', userId], queryFn: () => getActivityFromFollowed(userId) });
  const suggestions = useQuery({
    queryKey: [...qk.suggestions, favIds.join(',')],
    queryFn: () => getSuggestions(favIds, (recent.data?.items ?? []).map((e) => e.book.id)),
    enabled: favGenres.isSuccess && recent.isSuccess,
  });

  const firstName = profile.data?.display_name?.split(' ')[0] ?? '';
  const total = counts.data?.all ?? 0;
  const unread = (counts.data?.want_to_read ?? 0) + (counts.data?.on_hold ?? 0);
  const current = reading.data?.items[0];
  const riddlesDone = (today.data ?? []).filter((c) => c.attempt && c.attempt.status !== 'in_progress').length;

  return (
    <Screen tabBarInset onRefresh={() => void queryClient.invalidateQueries()} refreshing={false}>
      {/* Masthead */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
        <Wordmark size={13} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <StreakBadge days={progress.data?.current_streak ?? 0} active={!!progress.data?.played_today} />
          <IconButton icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        </View>
      </View>
      <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
        <Text variant="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text variant="title1" accessibilityRole="header">
          {greetingFor()}
          {firstName ? `, ${firstName}.` : '.'}
        </Text>
      </View>

      {/* Your library */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Your library: ${total} books, ${unread} unread. Open library`} onPress={() => router.push('/library')}>
        <LibraryScene id="great-hall" style={{ height: 232, borderRadius: radius.xl, marginBottom: spacing.xxl }}>
          <LinearGradient colors={['rgba(14,9,5,0.15)', 'rgba(14,9,5,0.88)']} locations={[0.15, 0.85]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg, gap: spacing.xs }}>
            <Text variant="eyebrow" style={{ color: '#E9CF95' }}>
              Your library
            </Text>
            {counts.isLoading ? (
              <Skeleton width={180} height={30} />
            ) : (
              <Text style={{ fontFamily: fonts.serifBold, fontSize: 32, lineHeight: 36, color: '#F8F0DF' }}>
                {total} {total === 1 ? 'tome' : 'tomes'} on your shelves
              </Text>
            )}
            <Text variant="callout" style={{ color: '#E6DAC2' }}>
              {total === 0 ? 'Begin by adding the books you own and love.' : unread ? `${unread} still waiting to be read` : 'Every one of them read. Impressive.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button title="Add books" icon="plus" size="sm" onPress={() => router.push('/add-book')} />
              <Button title="Open library" size="sm" variant="secondary" onPress={() => router.push('/library')} />
            </View>
          </View>
        </LibraryScene>
      </Pressable>

      {/* What to read next — from the reader's own shelves */}
      <View style={{ marginBottom: spacing.xxl }}>
        <SectionHeader eyebrow="From your own shelves" title="What to read next" />
        {nextReads.isLoading ? (
          <Skeleton height={190} />
        ) : nextReads.data?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -layout.screenPadding }} contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, gap: spacing.base }}>
            {nextReads.data.map((c, i) => (
              <Pressable
                key={c.book.id}
                accessibilityRole="button"
                accessibilityLabel={`${c.book.title}. ${c.reason}`}
                onPress={() => router.push({ pathname: '/book/[id]', params: { id: c.book.id } })}
                style={({ pressed }) => ({ width: 132, gap: spacing.sm, opacity: pressed ? 0.8 : 1 })}
              >
                <View>
                  <BookCover title={c.book.title} author={c.book.authors} uri={c.book.cover_url} width={132} accessible={false} />
                  {i === 0 ? (
                    <View style={{ position: 'absolute', top: -8, left: -6, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.gold }}>
                      <Text variant="eyebrow" style={{ color: '#FFF8E8', fontSize: 9 }}>
                        Top pick
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="bookTitle" numberOfLines={2} style={{ fontSize: 16, lineHeight: 19 }}>
                  {c.book.title}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <Glyph name="magic" size={10} />
                  <Text variant="caption" style={{ flex: 1, fontSize: 11.5 }} numberOfLines={2}>
                    {c.reason}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <OrnateFrame>
            <EmptyState
              compact
              icon="book"
              title="Your unread shelf is empty"
              body="Add the books you own but haven’t read yet (mark them as Want to Read) and GriMore will help you choose between them."
              actionLabel="Add books"
              onAction={() => router.push('/add-book')}
            />
          </OrnateFrame>
        )}
      </View>

      {/* Currently reading */}
      <View style={{ marginBottom: spacing.xxl }}>
        <SectionHeader eyebrow="By candlelight" title="Currently reading" actionLabel={reading.data && reading.data.items.length > 1 ? 'All' : undefined} onAction={() => router.push({ pathname: '/library', params: { status: 'reading' } })} />
        {reading.isLoading ? (
          <Skeleton height={170} />
        ) : current ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/book/[id]', params: { id: current.book.id } })}>
            <OrnateFrame padding={spacing.base}>
              <View style={{ flexDirection: 'row', gap: spacing.base, alignItems: 'center' }}>
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
              </View>
            </OrnateFrame>
          </Pressable>
        ) : (
          <Text variant="callout" tone="muted">
            Nothing open on the desk. Choose your next read above and mark it as Reading.
          </Text>
        )}
      </View>

      {/* Quest */}
      {goal.data?.target ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="eyebrow">The {goal.data.year} quest</Text>
            <Text variant="caption">
              {goal.data.read} of {goal.data.target} books
            </Text>
          </View>
          <ProgressBar value={goal.data.read / goal.data.target} tone="olive" height={6} />
        </Pressable>
      ) : null}

      {/* Recently added, standing on a shelf */}
      {recent.data && recent.data.items.length > 0 ? (
        <View style={{ marginBottom: spacing.xxl }}>
          <SectionHeader eyebrow="New arrivals" title="Recently shelved" actionLabel="Library" onAction={() => router.push('/library')} />
          <BookShelf books={recent.data.items.slice(0, 12).map((e) => e.book)} width={78} />
        </View>
      ) : null}

      <Flourish glyph="dragon" style={{ marginBottom: spacing.xxl }} />

      {/* Beyond your shelves */}
      <View style={{ marginBottom: spacing.xxl }}>
        <SectionHeader eyebrow="Beyond your shelves" title={favGenres.data?.length ? `For a lover of ${favGenres.data[0].name.toLowerCase()}` : 'Classics worth an evening'} />
        <Shelf books={suggestions.data ?? []} loading={suggestions.isLoading || !favGenres.isSuccess} />
      </View>

      {/* Readers */}
      {activity.data && activity.data.length > 0 ? (
        <View style={{ marginBottom: spacing.xxl }}>
          <SectionHeader eyebrow="Fellow readers" title="In other Nooks" actionLabel="Readers" onAction={() => router.push('/social')} />
          <View style={{ gap: spacing.base }}>
            {activity.data.map((a) => (
              <Pressable key={a.id} accessibilityRole="button" onPress={() => a.book && router.push({ pathname: '/book/[id]', params: { id: a.book.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar name={a.user?.display_name ?? a.user?.username ?? '?'} uri={a.user?.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="callout" numberOfLines={2}>
                    <Text variant="callout" style={{ fontFamily: fonts.sansSemibold }}>
                      {a.user?.display_name ?? a.user?.username}
                    </Text>
                    {a.status === 'reading' ? ' opened ' : ' finished '}
                    <Text variant="callout" style={{ fontFamily: fonts.serifItalic, fontSize: 16 }}>
                      {a.book?.title}
                    </Text>
                  </Text>
                  <Text variant="caption">{relativeTime(a.updated_at)}</Text>
                </View>
                {a.book ? <BookCover title={a.book.title} uri={a.book.cover_url} size="xs" accessible={false} /> : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Daily riddles: a small extra */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Daily riddles, ${riddlesDone} of 3 solved today`} onPress={() => router.push('/play')}>
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.base, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Glyph name="hat-wizard" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="bookTitle">Daily riddles</Text>
              <Text variant="caption">Three small literary puzzles · {riddlesDone}/3 today</Text>
            </View>
            <Text variant="callout" tone="accent">
              Play
            </Text>
          </View>
          <DailyStrip challenges={today.data} loading={today.isLoading} compact />
        </View>
      </Pressable>
    </Screen>
  );
}
