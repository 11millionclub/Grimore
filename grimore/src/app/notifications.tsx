import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Avatar, Button, EmptyState, ErrorState, Icon, Screen, Skeleton, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { acceptFollow, getNotifications, markNotificationsRead } from '@/services/social';
import { radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

const COPY: Record<string, string> = {
  follow: 'started following you',
  follow_request: 'asked to follow you',
  follow_accepted: 'accepted your follow request',
  post_like: 'liked your post',
  post_comment: 'replied to your post',
  review_like: 'liked your review',
  review_comment: 'replied to your review',
  comment_reply: 'replied to your comment',
  achievement: 'You earned an achievement',
};

export default function Notifications() {
  const me = useMyId()!;
  const { colors } = useTheme();
  const list = useQuery({ queryKey: qk.notifications, queryFn: () => getNotifications(me) });

  useEffect(() => {
    if (list.isSuccess) void markNotificationsRead(me);
  }, [list.isSuccess, me]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Notifications" />
      <Screen edgeTop={false} onRefresh={() => void list.refetch()} refreshing={list.isRefetching}>
        {list.isLoading ? <Skeleton height={200} /> : null}
        {list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : null}
        {list.data?.length === 0 ? <EmptyState icon="bell" title="All quiet" body="Likes, replies and new followers will appear here." /> : null}
        <View style={{ gap: spacing.xs }}>
          {list.data?.map((n) => {
            const actorName = n.actor?.display_name ?? n.actor?.username ?? '';
            const target = n.post_id ? { type: 'post', id: n.post_id } : n.review_id ? { type: 'review', id: n.review_id } : null;
            return (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                onPress={() => {
                  if (target) router.push({ pathname: '/item/[type]/[id]', params: target });
                  else if (n.type === 'achievement') router.push('/play/streak');
                  else if (n.actor) router.push({ pathname: '/user/[username]', params: { username: n.actor.username } });
                }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: n.read_at ? 'transparent' : colors.accentSoft, opacity: pressed ? 0.8 : 1 })}
              >
                {n.type === 'achievement' ? (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="award" size={16} color={colors.onAccent} />
                  </View>
                ) : (
                  <Avatar name={actorName || '?'} uri={n.actor?.avatar_url} size={36} />
                )}
                <View style={{ flex: 1 }}>
                  <Text variant="callout">
                    {n.type === 'achievement' ? COPY.achievement : <><Text variant="callout" style={{ fontWeight: '600' }}>{actorName}</Text> {COPY[n.type]}</>}
                  </Text>
                  <Text variant="caption">{relativeTime(n.created_at)}</Text>
                </View>
                {n.type === 'follow_request' && n.actor ? <Button title="Accept" size="sm" onPress={() => void acceptFollow(me, n.actor!.id).then(() => list.refetch())} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Screen>
    </View>
  );
}
