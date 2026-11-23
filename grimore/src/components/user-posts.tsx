import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { PostCard } from '@/components/feed';
import { PencilSimpleLineIcon } from '@/components/icons';
import { Btn, EmptyState, Skeleton } from '@/components/ui';
import { getFeed } from '@/services/social';
import { radius, spacing, useTheme } from '@/theme';

/** A reader's own posts and reviews, newest first (their timeline, like Threads or X). */
export function UserPosts({ userId, viewerId }: { userId: string; viewerId: string }) {
  const { colors } = useTheme();
  const mine = userId === viewerId;
  const feed = useInfiniteQuery({
    queryKey: ['feed', 'user', userId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getFeed({ viewerId, scope: 'discover', userId, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <View style={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
      {mine ? (
        <Btn variant="secondary" full icon={<PencilSimpleLineIcon size={16} color={colors.ink} />} onPress={() => router.push('/compose')}>
          Write a post
        </Btn>
      ) : null}
      {feed.isLoading ? [0, 1].map((k) => <Skeleton key={k} height={140} rounded={radius.card} />) : null}
      {!feed.isLoading && items.length === 0 ? <EmptyState title="No posts yet" body={mine ? 'Share a thought about a book, an author or anything you like.' : undefined} /> : null}
      {items.map((it) => (
        <PostCard key={`${it.item_type}-${it.id}`} post={it} />
      ))}
      {feed.hasNextPage ? (
        <Btn variant="ghost" size="sm" loading={feed.isFetchingNextPage} onPress={() => void feed.fetchNextPage()} style={{ alignSelf: 'center' }}>
          Load more
        </Btn>
      ) : null}
    </View>
  );
}
