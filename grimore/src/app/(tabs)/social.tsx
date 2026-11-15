import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/feed-card';
import { EmptyState, ErrorState, IconButton, Segmented, Skeleton, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { getFeed } from '@/services/social';
import { layout, spacing, useTheme } from '@/theme';

type Scope = 'following' | 'discover' | 'reviews';
const SCOPES: { value: Scope; label: string }[] = [
  { value: 'following', label: 'Following' },
  { value: 'discover', label: 'Discover' },
  { value: 'reviews', label: 'Reviews' },
];

export default function Social() {
  const userId = useMyId()!;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>('discover');

  const feed = useInfiniteQuery({
    queryKey: qk.feed(scope),
    queryFn: ({ pageParam }) => getFeed({ viewerId: userId, scope, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);

  const header = (
    <View style={{ paddingTop: insets.top + spacing.base, gap: spacing.lg, marginBottom: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="eyebrow">The reading room</Text>
          <Text variant="title1" accessibilityRole="header">
            Social
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <IconButton icon="user-plus" label="Find readers" filled onPress={() => router.push('/find-readers')} />
          <IconButton icon="edit-3" label="Write a post" filled tone="accent" onPress={() => router.push('/compose')} />
        </View>
      </View>
      <Segmented options={SCOPES} value={scope} onChange={setScope} />
    </View>
  );

  const empty = feed.isLoading ? (
    <View style={{ gap: spacing.xl, marginTop: spacing.lg }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: spacing.md }}>
          <Skeleton width={160} height={14} />
          <Skeleton height={60} />
        </View>
      ))}
    </View>
  ) : feed.isError ? (
    <ErrorState onRetry={() => void feed.refetch()} />
  ) : scope === 'following' ? (
    <EmptyState icon="users" title="A quiet room" body="Follow readers to see their thoughts, questions and reviews here." actionLabel="Find readers" onAction={() => router.push('/find-readers')} />
  ) : (
    <EmptyState icon="feather" title="Start the conversation" body="Share a thought about what you are reading, or ask other readers a question." actionLabel="Write a post" onAction={() => router.push('/compose')} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.item_type}:${i.id}`}
        renderItem={({ item }) => <FeedCard item={item} compact />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingBottom: layout.tabBarHeight + insets.bottom + spacing.xxxl, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: spacing.lg }} /> : undefined}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => void feed.refetch()}
        initialNumToRender={6}
        windowSize={9}
      />
    </View>
  );
}
