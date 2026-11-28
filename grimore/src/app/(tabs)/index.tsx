import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppActions } from '@/components/app-actions';
import { PostCard, Ring } from '@/components/feed';
import { HouseWelcomeCard } from '@/components/house-welcome';
import { ArrowRightIcon, BookOpenIcon, FireIcon } from '@/components/icons';
import { Avatar, Btn, Cover, EmptyState, Press, Progress, Screen, SectionHead, Skeleton, Stagger, Text } from '@/components/ui';
import { useMyId, useReadingGoal, useReadingStats, useShelf, useStreak, useTodayGames, useUnread } from '@/hooks/queries';
import { getLeaderboard } from '@/services/games';
import { getFeed } from '@/services/social';
import { monthName } from '@/services/stats';
import { progressOf } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { fmt } from '@/utils/dates';

export default function Home() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const reading = useShelf(me, 'reading');
  const goal = useReadingGoal(me);
  const streak = useStreak();
  const stats = useReadingStats(me);
  const unread = useUnread();
  const games = useTodayGames();
  const hangman = games.data?.find((g) => g.game === 'hangman');
  const board = useQuery({ queryKey: ['board', hangman?.id], queryFn: () => getLeaderboard(hangman!.id), enabled: !!hangman });
  const leader = board.data?.find((r) => !r.is_me);
  const feed = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getFeed({ viewerId: me, scope: 'following', cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const month = new Date().getMonth();
  const monthPages = stats.data?.pagesByMonth[month] ?? 0;
  const refresh = () => Promise.all([reading.refetch(), goal.refetch(), streak.refetch(), feed.refetch(), games.refetch(), stats.refetch(), unread.refetch()]);

  return (
    <Screen
      title="Grimore"
      tabs
      refreshing={feed.isRefetching}
      onRefresh={refresh}
      actions={<AppActions />}
    >
      <HouseWelcomeCard />
      {reading.isLoading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Skeleton height={168} rounded={radius.card} />
        </View>
      ) : (reading.data ?? []).length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Press onPress={() => router.push('/add')} style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <BookOpenIcon size={24} weight="fill" color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title">What are you reading?</Text>
              <Text variant="small" tone="muted">
                Scan, search or photograph your shelf to start.
              </Text>
            </View>
            <ArrowRightIcon size={18} weight="bold" color={colors.muted} />
          </Press>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={312} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {(reading.data ?? []).map((r, i) => {
            const { pct, label } = progressOf(r);
            return (
              <Stagger key={r.id} i={i}>
                <View style={{ width: 300, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
                  <Press accessibilityRole="button" accessibilityLabel={`Open ${r.book.title}`} onPress={() => router.push({ pathname: '/book/[id]', params: { id: r.book.id } })} style={{ flexDirection: 'row', gap: spacing.base }}>
                    <Cover uri={r.book.cover_url} title={r.book.title} author={r.book.authors} width={76} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="caption" tone="accent" style={{ fontFamily: fonts.medium }}>
                        Reading
                      </Text>
                      <Text variant="title" numberOfLines={1} style={{ marginTop: 2 }}>
                        {r.book.title}
                      </Text>
                      <Text variant="small" tone="muted" numberOfLines={1}>
                        {r.book.authors}
                      </Text>
                      <View style={{ marginTop: 'auto' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text variant="caption" tone="muted">
                            {label}
                          </Text>
                          <Text variant="caption" tone="muted">
                            {Math.round(pct * 100)}%
                          </Text>
                        </View>
                        <Progress value={pct} />
                      </View>
                    </View>
                  </Press>
                  <Btn variant="secondary" size="sm" full style={{ marginTop: spacing.base }} onPress={() => router.push({ pathname: '/progress/[bookId]', params: { bookId: r.book.id } })}>
                    {r.format && r.format !== 'print' ? 'Update progress' : 'Update page'}
                  </Btn>
                </View>
              </Stagger>
            );
          })}
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <Press onPress={() => router.push('/goals')} style={{ flex: 1.25, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <Ring value={goal.data?.target ? goal.data.read / goal.data.target : 0} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 22, lineHeight: 24 }}>
              {goal.data?.read ?? 0}
              <Text variant="body" tone="muted" style={{ fontFamily: fonts.medium }}>
                {goal.data?.target ? `/${goal.data.target}` : ''}
              </Text>
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
              {goal.data?.target ? `books in your ${new Date().getFullYear()} goal` : 'Set a reading goal'}
            </Text>
          </View>
        </Press>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base, justifyContent: 'space-between', gap: spacing.sm }}>
          <FireIcon size={22} weight="fill" color={colors.accent} />
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 22, lineHeight: 24 }}>
              {streak.data?.current ?? 0} {streak.data?.current === 1 ? 'day' : 'days'}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
              reading in a row
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <Press onPress={() => router.push({ pathname: '/wrapped', params: { period: 'month' } })} style={{ overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.accent, padding: spacing.lg }}>
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.12)', 'rgba(0,0,0,0.18)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -70, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: colors.gold, opacity: 0.45 }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: -24, top: -34, width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: colors.gold, opacity: 0.3 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.base }}>
            <View style={{ flex: 1 }}>
              <Text variant="small" tone="onAccent" style={{ fontFamily: fonts.semibold, opacity: 0.8 }}>
                {monthName(month)} · Readers Codex
              </Text>
              <Text tone="onAccent" style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 31, marginTop: 4 }}>
                {monthPages ? `${fmt(monthPages)} pages.\nYour month, told.` : 'Your month,\ntold in pages.'}
              </Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.onAccent, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightIcon size={20} weight="bold" color={colors.accent} />
            </View>
          </View>
        </Press>
      </View>

      {hangman ? (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <Press onPress={() => router.push({ pathname: '/game/[id]', params: { id: hangman.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, paddingRight: spacing.base }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 15 }}>{(hangman.view.mask ?? '___').replace(/\s/g, '').slice(0, 3)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong">Hangman #{hangman.number}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {leader ? <Avatar uri={leader.avatar_url} name={leader.display_name} size={16} /> : null}
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {hangman.attempt?.status === 'won'
                    ? `Solved in ${Math.floor((hangman.attempt.time_seconds ?? 0) / 60)}:${String((hangman.attempt.time_seconds ?? 0) % 60).padStart(2, '0')}`
                    : leader
                      ? `${(leader.display_name ?? leader.username).split(' ')[0]} solved it in ${Math.floor(leader.time_seconds / 60)}:${String(leader.time_seconds % 60).padStart(2, '0')}`
                      : 'Today’s title is waiting'}
                </Text>
              </View>
            </View>
            <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
              {hangman.attempt?.status && hangman.attempt.status !== 'in_progress' ? 'Results' : 'Play'}
            </Text>
          </Press>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title="From people you follow" />
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
          {feed.isLoading ? (
            [0, 1].map((k) => <Skeleton key={k} height={180} rounded={radius.card} />)
          ) : items.length === 0 ? (
            <EmptyState title="Your feed is quiet" body="Follow readers in Explore, or share what you are reading." action="Find readers" onAction={() => router.push('/explore')} />
          ) : (
            items.map((p, i) => (
              <Stagger key={`${p.item_type}-${p.id}`} i={i + 2}>
                <PostCard post={p} />
              </Stagger>
            ))
          )}
        </View>
        {feed.hasNextPage ? (
          <Btn variant="ghost" size="sm" loading={feed.isFetchingNextPage} onPress={() => feed.fetchNextPage()} style={{ alignSelf: 'center', marginTop: spacing.lg }}>
            Load more
          </Btn>
        ) : items.length ? (
          <Text variant="small" tone="faint" align="center" style={{ paddingVertical: spacing.xxl }}>
            You are all caught up. Follow more readers in Explore.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
